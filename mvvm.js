class MVVM {
    constructor(options) {
        this.options = options;
        Object.assign(this, options);
        Object.assign(this, options.data);
        this.el = options.el;
        this.parser = new Parser(this.$mount(options))
        this.vdom = new VDOM()
        this.addHelper()
        this.prevNode = null

        // make data reactivity
        observe(options.data)
        this.proxy(options)

        // compile tempate
        this.code = this.parser.generate();
        this.render = this.createFunction(this.code.render)

        // add a init watcher
        new Watcher(_ => {
            this.updateComponent()
        })
    }
    // 访问MVVM实例上的数据时 代理到data上。从而实现，修改this.count data的count有reactivity
    proxy(options) {
        let data = options.data
        let that = this
        Object.keys(data).forEach(key => {
            Object.defineProperty(that, key, {
                get: function proxyGetter() {
                    return that.data[key];
                },
                set: function proxySetter(val) {
                    that.data[key] = val
                }
            })
        });
    }
    updateComponent() {
        let prevNode = this.prevNode
        // 返回虚拟DOM。其实就是一个JS对象。
        let vnode = this.render.call(this);
        this.prevNode = vnode
        // init render
        if (!prevNode) {
            // create an empty node and replace it
            let oldVnode = this.vdom.emptyNodeAt(nodeOps.getElementById(this.el.replace(/#/, '')));
            // replacing existing element
            var oldElm = oldVnode.elm;
            var parentElm = nodeOps.parentNode(oldElm);
            this.vdom.createElm(vnode, parentElm, nodeOps.nextSibling(oldElm));
        }
        // diff & patch
        else {
            // patch方法会通过diff算法。比较两个虚拟DOM树的差异。
            // 然后更新到浏览器
            this.vdom.patch(prevNode, vnode, this.el);
        }
    }
    $mount(options) {
        if (options.template) {
            return options.template
        } else {
            return document.querySelector(options.el)
        }
    }
    createFunction(code) {
        try {
            return new Function(code)
        } catch (e) {
            console.log(e)
        }
    }
    addHelper() {
        this._s = Util.toString
        this._c = this.createElement.bind(this)
        this._v = this.vdom.createTextVNode.bind(this.vdom)
        this._e = this.vdom.createEmptyVNode.bind(this.vdom)
    }
    createElement(tag, data, children, normalizationType, context) {
        return this.vdom.createVNode({
            tag: tag,
            data: Array.isArray(data) ? undefined : data,
            children: children || data,
            text: undefined,
            el: undefined,
            context: context ? context : this
        });
    }
}

const observe = function (obj) {
    Object.keys(obj).forEach(key => {
        let v = obj[key];
        let dep = new Dep();
        Object.defineProperty(obj, key, {
            get() {
                dep.depend();
                return v;
            },
            set(newVal) {
                if (newVal != v) {
                    // 注意先设置值
                    v = newVal;
                    dep.notify();
                }
            }
        })

    })
}
class Watcher {
    constructor(update) {
        // this.active = false;
        this.updateFn = update;
        Dep.target = this;
        // first run
        this.update();
    }
    update() {
        console.log('视图更新啦')
        this.updateFn();
    }
}
class Dep {
    constructor() {
        this.subscribers = new Set();
    }
    depend() {
        if (Dep.target) {
            this.subscribers.add(Dep.target)
        }
        // if (activeUpdate) {
        //     this.subscribers.add(activeUpdate)
        // }
    }
    notify() {
        this.subscribers.forEach(subs => subs.update())
    }
}

// let activeUpdate
// const autorun = function (update) {
//     const wrapperUpdate = function () {
//         activeUpdate = update
//         update()
//         activeUpdate = null
//     }
//     wrapperUpdate()
// }
