// const isComp = Symbol('isComponent')
import VDOM from './virtual-dom.js'
import Parser from './parser.js'
import Util from './util.js'

const vdom = new VDOM()

class MVVM {
    constructor(options) {
        this.init(options)
    }
    init(options) {
        this.options = options;
        this._base = MVVM
        Object.assign(this, options);
        Object.assign(this, options.data);
        if (typeof options.data == 'function') {
            this.data = options.data.call(this)
        } else {
            this.data = options.data
        }
        this.el = options.el;
        this.parser = new Parser(this.$mount())

        this.addHelper()
        this.prevNode = null

        // make data reactivity
        observe(this.data)
        this.proxy(this.data)

        // compile tempate to ast
        this.code = this.parser.generate();
        // ast to render function
        this.render = this.createFunction(this.code.render)

        // add an init watcher
        new Watcher(_ => {
            this.updateComponent()
        })
    }
    static extend(options) {
        const Parent = this
        let Child = function (options) {
            this.init(options)
        }
        // 构造函数才有prototype
        Child.prototype = Object.create(Parent.prototype)
        Child.prototype.constructor = Parent
        Child.options = {}
        Object.assign(Child.options, options)
        return Child
    }
    // 访问MVVM实例上的数据时 代理到data上。从而实现，修改this.count data的count有reactivity
    proxy(data = {}) {
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
        // 执行完render方法才返回完整的DOM树。返回虚拟DOM。其实就是一个JS对象。
        let vnode = this.render.call(this);
        this.prevNode = vnode
        // init render
        if (!prevNode) {
            this.elm = vdom.patch(document.querySelector(this.el), vnode)
        }
        // diff & patch
        else {
            // patch方法会通过diff算法。比较两个虚拟DOM树的差异。
            // 然后更新到浏览器
            this.elm = vdom.patch(prevNode, vnode, this.el);
        }
    }
    $mount() {
        if (this.options.template) {
            return this.options.template.trim()
        } else {
            if (this.options.el) {
                return document.querySelector(this.options.el).outerHTML
            } else {
                //...
            }
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
        this._v = vdom.createTextVNode.bind(vdom)
        this._e = vdom.createEmptyVNode.bind(vdom)
    }
    isComp(tag) {
        const asset = this.options.components
        if (!asset) return false
        return asset[tag]
    }
    // 模版中有组件的时候，进行组件的实例化
    installComponentHooks(data) {
        data.hooks = {
            init(vnode) {
                const child = vnode.componentInstance = new vnode.componentOptions.ctor(vnode.componentOptions)
                child.$mount(vnode.elm)
            }
        }
    }
    createElement(tag, data, children, normalizationType, context) {
        const params = {
            tag,
            data: Array.isArray(data) ? {} : data,
            children: children || data,
            text: undefined,
            el: undefined,
            context: context ? context : this
        }
        let ctor
        if (ctor = this.isComp(tag)) {
            const options = Object.assign({}, ctor)
            this.installComponentHooks(params.data)
            if (typeof ctor == 'object') {
                ctor = MVVM.extend(ctor)
            }
            return vdom.createVNode(Object.assign(params, {
                tag: `vue-component-${ctor.id}-${name}`,
                componentOptions: Object.assign(options, {
                    ctor
                })
            }))
        }
        return vdom.createVNode(params);
    }
}

const observe = function (obj = {}) {
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

export default MVVM