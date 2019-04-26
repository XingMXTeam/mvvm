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
`generate` step will make the AST to a `render` function which is used to create DOM.
It is string like this `with(this){return _c('div' ,[_v(_s(count)),_c('button',{ on: { "click": function($events) { count++ }  } }  ,[_v("increment")])])}`

`_c`, `_v` is method alias, they are defined in `virtual-dom.js`

3 `virtual-dom.js` 

The `render` function will use `virtual-dom`'s methods to make DOM recursively.

Also Need to know that, `createElm` method in `virtual-dom.js` will add 
event listener to `vnode`.

When the DOM is ready by init,  and some mutation happend by Events
or change the `data` directly. The `patch` method will be called. 
It will diff the virtual dom, namely the `vnode` and update the DOM.



