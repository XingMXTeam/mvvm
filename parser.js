class Parser {
    constructor(template) {
        this.template = template
        // 保存已经解析好的标签头
        this.stack = []
        this.root
        this.currentParent
        // 模板匹配正则
        this.Reg_ncname = '[a-zA-Z_][\\w\\-\\.]*'
        this.Reg_singleAttrIdentifier = /([^\s"'<>/=]+)/
        this.Reg_singleAttrAssign = /(?:=)/
        this.Reg_singleAttrValues = [
            /"([^"]*)"+/.source, //
            /'([^']*)'+/.source,
            /([^\s"'=<>`]+)/.source
        ]
        this.Reg_attribute = new RegExp(
            '^\\s*' + this.Reg_singleAttrIdentifier.source +
            '(?:\\s*(' + this.Reg_singleAttrAssign.source + ')' +
            '\\s*(?:' + this.Reg_singleAttrValues.join('|') + '))?'
        )
        this.Reg_qnameCapture = '((?:' + this.Reg_ncname + '\\:)?' + this.Reg_ncname + ')'
        this.Reg_startTagOpen = new RegExp('^<' + this.Reg_qnameCapture)
        this.Reg_startTagClose = /^\s*(\/?)>/
        this.Reg_endTag = new RegExp('^<\\/' + this.Reg_qnameCapture + '[^>]*>')
        this.Reg_defaultTagRE = /\{\{((?:.|\n)+?)\}\}/g
        this.Reg_forAliasRE = /(.*?)\s+(?:in|of)\s+(.*)/

        this.Reg_onRE = /^@|^v-on:/

        // 解析模板
        this.index = 0;
        this.parseTemplate();
        this.optimize();
    }
    // attrs 转换成 map 
    makeAttrsMap(attrs) {
        const map = {}
        for (let i = 0, l = attrs.length; i < l; i++) {
            map[attrs[i].name] = attrs[i].value;
        }
        return map
    }
    // 编译模板
    parseTemplate() {
        while (this.template) {
            let textEnd = this.template.indexOf('<')
            if (textEnd === 0) {
                if (this.template.match(this.Reg_endTag)) {
                    //process end tag
                    const endTagMatch = this.template.match(this.Reg_endTag)
                    this.advance(endTagMatch[0].length);
                    this.parseEndTag(endTagMatch[1]);
                    continue;
                }
                if (this.template.match(this.Reg_startTagOpen)) {
                    // process start tag
                    const startTagMatch = this.parseStartTag();
                    // AST节点
                    const element = {
                        type: 1,
                        tag: startTagMatch.tagName,
                        lowerCasedTag: startTagMatch.tagName.toLowerCase(),
                        attrsList: startTagMatch.attrs,
                        attrsMap: this.makeAttrsMap(startTagMatch.attrs),
                        parent: this.currentParent,
                        children: []
                    }

                    this.processIf(element);
                    this.processFor(element);
                    this.processEvents(element)

                    // 保存标签层级关系
                    if (!this.root) {
                        this.root = element
                    }

                    if (this.currentParent) {
                        this.currentParent.children.push(element);
                    }

                    this.stack.push(element);
                    this.currentParent = element;
                    continue;
                }
            } else {
                //process text
                let text = this.template.substring(0, textEnd)
                this.advance(textEnd)
                let expression;
                if (expression = this.parseText(text)) {
                    this.currentParent.children.push({
                        type: 2,
                        text,
                        expression
                    });
                } else {
                    this.currentParent.children.push({
                        type: 3,
                        text,
                    });
                }
                continue;
            }
        }
        return this.root;
    }
    advance(n) {
        this.index += n
        this.template = this.template.substring(n)
    }
    compile() {

    }
    parseStartTag() {
        const start = this.template.match(this.Reg_startTagOpen)
        if (start) {
            const match = {
                tagName: start[1],
                attrs: [],
                start: this.index
            }
            this.advance(start[0].length);

            // 匹配属性
            let end, attr
            while (!(end = this.template.match(this.Reg_startTagClose)) && (attr = this.template.match(this.Reg_attribute))) {
                this.advance(attr[0].length)
                match.attrs.push({
                    name: attr[1],
                    value: attr[3]
                });
            }
            if (end) {
                match.unarySlash = end[1];
                this.advance(end[0].length);
                match.end = this.index;
                return match
            }
        }
    }
    parseEndTag(tagName) {
        let pos;
        for (pos = this.stack.length - 1; pos >= 0; pos--) {
            if (this.stack[pos].lowerCasedTag === tagName.toLowerCase()) {
                break;
            }
        }

        if (pos >= 0) {
            this.currentParent = this.stack[pos];
            // 出栈
            this.stack.length = pos;
        }
    }
    // {{name}} => _s(name)
    parseText(text) {
        if (!this.Reg_defaultTagRE.test(text)) return;

        const tokens = [];
        let lastIndex = this.Reg_defaultTagRE.lastIndex = 0
        let match, index
        while (match = this.Reg_defaultTagRE.exec(text)) {
            index = match.index

            if (index > lastIndex) {
                tokens.push(JSON.stringify(text.slice(lastIndex, index)))
            }

            const exp = match[1].trim()
            tokens.push(`_s(${exp})`)
            lastIndex = index + match[0].length
        }

        if (lastIndex < text.length) {
            tokens.push(JSON.stringify(text.slice(lastIndex)))
        }
        return tokens.join('+');
    }
    processEvents(elm) {
        const list = elm.attrsList;
        list.forEach(item => {
            let name = item.name
            let value = item.value
            if (this.Reg_onRE.test(name)) {
                if (!elm.events) {
                    elm.events = {}
                }
                item.name = name.replace(/@/, '')
                elm.events[item.name] = {
                    name,
                    value
                }
            }
        })
    }
    processFor(elm) {}
    processIf(elm) {}
    isStatic(node) {
        // 表达式
        if (node.type === 2) {
            return false
        }
        // 纯文本
        if (node.type === 3) {
            return true
        }
        // 如果存在if或者for则是动态节点
        return (!node.if && !node.for);
    }
    markStatic(node) {
        node.static = this.isStatic(node);
        // 普通节点
        if (node.type === 1) {
            for (let i = 0, l = node.children.length; i < l; i++) {
                const child = node.children[i];
                this.markStatic(child);
                if (!child.static) {
                    node.static = false;
                }
            }
        }
    }
    // 普通节点并且子节点不是单纯的文本
    markStaticRoots(node) {
        if (node.type === 1) {
            if (node.static && node.children.length && !(
                    node.children.length === 1 &&
                    node.children[0].type === 3
                )) {
                node.staticRoot = true;
                return;
            } else {
                node.staticRoot = false;
            }
        }
    }
    optimize() {
        this.markStatic(this.root);
        this.markStaticRoots(this.root);
    }
    // 将AST 转换为 render字符串 
    generate() {
        function genText(el) {
            return `_v(${el.type === 2 ? el.expression : JSON.stringify(el.text)})`;
        }

        function genIf(el) {

        }

        function genFor(el) {

        }

        function genNode(el) {
            if (el.type === 1) {
                return genElement(el);
            } else {
                return genText(el);
            }
        }

        function genChildren(el) {
            const children = el.children;

            if (children && children.length > 0) {
                return `[${children.map(genNode).join(',')}]`;
            }
        }

        function genData(el) {
            if (el.events) {
                Object.keys(el.events).forEach(name => {
                    let handler = `function($events) { ${el.events[name].value} } `
                    el.data = `{ on: { "${name}": ${handler} } } `
                })
            }
            return el.data
        }

        function genElement(el) {
            if (el.if && !el.ifProcessed) {
                return genIf(el);
            } else if (el.for && !el.forProcessed) {
                return genFor(el);
            } else {
                const data = genData(el)
                const children = genChildren(el);
                let code;
                code = `_c('${el.tag}'${data ? ("," + data) : ''
                    } ${children ? ("," + children) : ''})`
                return code;
            }
        }
        const code = this.root ? genElement(this.root) : '_c("div")'
        // counter是组件
        // with(this){return _c('div',{attrs:{"id":"app"}},[_c('counter')],1)}
        return {
            render: `with(this){return ${code}}`,
        }
    }
}

export default Parser