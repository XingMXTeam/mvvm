// 多平台适配
const nodeOps = {
    setTextContent(node, text) {
        // if (platform === 'weex') {
        //     node.parentNode.setAttr('value', text);
        // } else if (platform === 'web') {
        node.textContent = text;
        // }
    },
    tagName(elm) {
        return elm.tagName
    },
    createTextNode(txt) {
        return document.createTextNode(txt)
    },
    getElementById(id) {
        return document.getElementById(id)
    },
    createElement(el) {
        return document.createElement(el)
    },
    parentNode(el) {
        return el.parentNode
    },
    removeChild(parent, elm) {
        return parent.removeChild(elem)
    },
    nextSibling(el) {
        return el.nextSibling
    },
    appendChild(parent, elm) {
        return parent.appendChild(elm)
    },
    // elm: 用于插入的节点
    // ref: 插在这个元素之前
    insertBefore(parent, elm, ref) {
        return parent.insertBefore(elm, ref)
    }
}

// VNode
class VNode {
    constructor({ tag, data, children, text, elm, context }) {
        this.tag = tag;
        this.data = data;
        this.children = children;
        this.text = text;
        this.elm = elm;
        this.context = context
    }
}
// VDOM
class VDOM {
    constructor() {

    }
    sameInputType(a, b) {
        if (a.tag !== 'input') return true
        let i
        const typeA = (i = a.data) && (i = i.attrs) && i.type
        const typeB = (i = b.data) && (i = i.attrs) && i.type
        return typeA === typeB
    }
    sameVnode(a, b) {
        return (
            a.key === b.key &&
            a.tag === b.tag &&
            a.isComment === b.isComment &&
            !!a.data === !!b.data &&
            this.sameInputType(a, b)
        )
    }
    createKeyToOldIdx(children, beginIdx, endIdx) {
        let i, key
        const map = {}
        for (i = beginIdx; i <= endIdx; ++i) {
            key = children[i].key
            if (Util.isDef(key)) map[key] = i
        }
        return map
    }
    createVNode(options) {
        return new VNode(options)
    }
    createTextVNode(val) {
        return new VNode({ text: String(val) });
    }
    createEmptyVNode() {
        const node = new VNode();
        node.text = '';
        return node;
    }
    removeNode(el) {
        const parent = nodeOps.parentNode(el);
        if (parent) {
            nodeOps.removeChild(parent, el);
        }
    }
    removeVnodes(parentElm, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            const ch = vnodes[startIdx]
            if (ch) {
                this.removeNode(ch.elm);
            }
        }
    }
    insert(parent, elm, ref) {
        if (parent) {
            if (ref) {
                if (ref.parentNode === parent) {
                    nodeOps.insertBefore(parent, elm, ref);
                }
            } else {
                nodeOps.appendChild(parent, elm)
            }
        }
    }
    createElm(vnode, parentElm, refElm) {
        if (vnode.tag) {
            vnode.elm = nodeOps.createElement(vnode.tag)

            // 绑定事件
            if (Util.isDef(vnode.data)) {
                let obj = vnode.data['on']
                Object.keys(obj).forEach(name => {
                    vnode.elm.addEventListener(name, e => {
                        obj[name].call(vnode.context, e)
                    })
                })
            }

            this.createChildren(vnode, vnode.children);
            this.insert(parentElm, vnode.elm, refElm);
        } else {
            vnode.elm = nodeOps.createTextNode(vnode.text)
            this.insert(parentElm, vnode.elm, refElm);
        }
    }
    createChildren(vnode, children) {
        if (Array.isArray(children)) {
            for (var i = 0; i < children.length; ++i) {
                this.createElm(children[i], vnode.elm);
            }
        } else if (vnode.text) {
            nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)));
        }
    }
    addVnodes(parentElm, refElm, vnodes, startIdx, endIdx) {
        for (; startIdx <= endIdx; ++startIdx) {
            this.createElm(vnodes[startIdx], parentElm, refElm);
        }
    }
    cloneVNode(node) {
        const cloneVnode = new VNode(
            node.tag,
            node.data,
            node.children,
            node.text,
            node.elm
        );

        return cloneVnode;
    }
    emptyNodeAt(elm) {
        return new VNode({ tag: nodeOps.tagName(elm).toLowerCase(), data: {}, children: [], text: undefined, elm })
    }
    patch(oldVnode, vnode, parentElm) {
        if (!oldVnode) {
            this.addVnodes(parentElm, null, vnode, 0, vnode.length - 1);
        } else if (!vnode) {
            this.removeVnodes(parentElm, oldVnode, 0, oldVnode.length - 1);
        } else {
            if (this.sameVnode(oldVnode, vnode)) {
                this.patchVnode(oldVnode, vnode);
            } else {
                this.removeVnodes(parentElm, oldVnode, 0, oldVnode.length - 1);
                this.addVnodes(parentElm, null, vnode, 0, vnode.length - 1);
            }
        }
    }
    patchVnode(oldVnode, vnode) {
        if (oldVnode === vnode) {
            return;
        }

        if (vnode.isStatic && oldVnode.isStatic && vnode.key === oldVnode.key) {
            vnode.elm = oldVnode.elm;
            vnode.componentInstance = oldVnode.componentInstance;
            return;
        }

        const elm = vnode.elm = oldVnode.elm;
        const oldCh = oldVnode.children;
        const ch = vnode.children;

        if (vnode.text) {
            nodeOps.setTextContent(elm, vnode.text);
        } else {
            if (oldCh && ch && (oldCh !== ch)) {
                this.updateChildren(elm, oldCh, ch);
            } else if (ch) {
                if (oldVnode.text) nodeOps.setTextContent(elm, '');
                this.addVnodes(elm, null, ch, 0, ch.length - 1);
            } else if (oldCh) {
                this.removeVnodes(elm, oldCh, 0, oldCh.length - 1)
            } else if (oldVnode.text) {
                nodeOps.setTextContent(elm, '')
            }
        }
    }
    updateChildren(parentElm, oldCh, newCh) {
        let oldStartIdx = 0;
        let newStartIdx = 0;
        let oldEndIdx = oldCh.length - 1;
        let oldStartVnode = oldCh[0];
        let oldEndVnode = oldCh[oldEndIdx];
        let newEndIdx = newCh.length - 1;
        let newStartVnode = newCh[0];
        let newEndVnode = newCh[newEndIdx];
        let oldKeyToIdx, idxInOld, elmToMove, refElm;

        while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (!oldStartVnode) {
                oldStartVnode = oldCh[++oldStartIdx];
            } else if (!oldEndVnode) {
                oldEndVnode = oldCh[--oldEndIdx];
            } else if (this.sameVnode(oldStartVnode, newStartVnode)) {
                this.patchVnode(oldStartVnode, newStartVnode);
                oldStartVnode = oldCh[++oldStartIdx];
                newStartVnode = newCh[++newStartIdx];
            } else if (this.sameVnode(oldEndVnode, newEndVnode)) {
                this.patchVnode(oldEndVnode, newEndVnode);
                oldEndVnode = oldCh[--oldEndIdx];
                newEndVnode = newCh[--newEndIdx];
            } else if (this.sameVnode(oldStartVnode, newEndVnode)) {
                this.patchVnode(oldStartVnode, newEndVnode);
                nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm));
                oldStartVnode = oldCh[++oldStartIdx];
                newEndVnode = newCh[--newEndIdx];
            } else if (this.sameVnode(oldEndVnode, newStartVnode)) {
                this.patchVnode(oldEndVnode, newStartVnode);
                nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm);
                oldEndVnode = oldCh[--oldEndIdx];
                newStartVnode = newCh[++newStartIdx];
            } else {
                let elmToMove = oldCh[idxInOld];
                if (!oldKeyToIdx) oldKeyToIdx = this.createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx);
                idxInOld = newStartVnode.key ? oldKeyToIdx[newStartVnode.key] : null;
                if (!idxInOld) {
                    this.createElm(newStartVnode, parentElm);
                    newStartVnode = newCh[++newStartIdx];
                } else {
                    elmToMove = oldCh[idxInOld];
                    if (this.sameVnode(elmToMove, newStartVnode)) {
                        this.patchVnode(elmToMove, newStartVnode);
                        oldCh[idxInOld] = undefined;
                        nodeOps.insertBefore(parentElm, newStartVnode.elm, oldStartVnode.elm);
                        newStartVnode = newCh[++newStartIdx];
                    } else {
                        this.createElm(newStartVnode, parentElm);
                        newStartVnode = newCh[++newStartIdx];
                    }
                }
            }
        }

        if (oldStartIdx > oldEndIdx) {
            refElm = (newCh[newEndIdx + 1]) ? newCh[newEndIdx + 1].elm : null;
            this.addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx);
        } else if (newStartIdx > newEndIdx) {
            this.removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx);
        }
    }
}