function _toString() {
    return Object.prototype.toString;
}
const Util = {
    isDef(v) {
        return v !== undefined && v !== null
    },
    isPlainObject(obj) {
        return _toString.call(obj) === '[object Object]'
    },
    toString(val) {
        return val == null
            ? ''
            : Array.isArray(val) || (Util.isPlainObject(val) && val.toString === _toString)
                ? JSON.stringify(val, null, 2)
                : String(val)
    }
}