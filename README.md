# simpleVue

A simple vue implementation for learning

## intro

1 `mvvm.js` is the core , it has two other classes `Watcher`, `Dep` and an observe function.

`Watcher` is responsible to call `update` function. The `update` 
function will update the  DOM.

`Dep` is responsible to collect all `Watcher`s, namely depencencies.

`observe` is responsible to make data reactivity. 

2 `parser.js` is the template compiler.

it includes three steps: `parse` -> `opitmize` -> `generate`.

`parser.js` will read `template`, and compile the `template` string
to AST which is a javascript object. A `vnode` is like this:

``` js
{
    attrsMap: {},
    attrsList: [],
    lowerCasedTag: "div",
    parent: undefined,
    static: false,
    staticRoot: false,
    tag: "div",
    type: 1,
    children: [{
        expression: "_s(count)"
        static: false
        text: "{{count}}"
        type: 2
    }]
}

```

`generate` step will make the AST to a `render` function which is used to create Virtual DOM Tree(A javascript object). AST will collect all informations on DOM node: v-show、v-if、v-for、@click and so on. `render` function handle `component` tag
as a normal element or node, but it will collect `component options`.

3 `virtual-dom.js`

The `render` function will use `virtual-dom`'s methods to make virtual DOM recursively.

`createElm` method in `virtual-dom.js` will add real event listener handler to `vnode`. If the `tag` is `component`,  `createElm` will create component, which
will trigger the component's `render` method be called.

When the DOM is ready by init,  and some mutation happend by Events
or change the `data` directly. The `patch` method will be called.
It will diff the virtual dom, namely the `vnode` and update the DOM.
