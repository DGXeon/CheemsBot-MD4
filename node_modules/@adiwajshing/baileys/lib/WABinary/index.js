"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Binary = exports.getBinaryNodeMessages = exports.reduceBinaryNodeToDictionary = exports.assertNodeErrorFree = exports.getBinaryNodeChildUInt = exports.getBinaryNodeChildBuffer = exports.getBinaryNodeChild = exports.getAllBinaryNodeChildren = exports.getBinaryNodeChildren = exports.encodeBinaryNode = exports.decodeBinaryNode = void 0;
const Constants_1 = require("../../WABinary/Constants");
const jid_utils_1 = require("./jid-utils");
const Binary_1 = require("../../WABinary/Binary");
const boom_1 = require("@hapi/boom");
const WAProto_1 = require("../../WAProto");
const LIST1 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '.', '�', '�', '�', '�'];
const LIST2 = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
function k(data, uint) {
    let arr = [];
    for (let a = 0; a < uint; a++) {
        arr.push(exports.decodeBinaryNode(data));
    }
    return arr;
}
function x(data, t, r, a) {
    const arr = new Array(2 * a - r);
    for (let n = 0; n < arr.length - 1; n += 2) {
        var s = data.readUint8();
        (arr[n] = t[s >>> 4]), (arr[n + 1] = t[15 & s]);
    }
    if (r) {
        arr[arr.length - 1] = t[data.readUint8() >>> 4];
    }
    return arr.join('');
}
function D(e, t, r) {
    var a = e.length % 2 == 1;
    r.writeUint8(t);
    var i = Math.ceil(e.length / 2);
    a && (i |= 128), r.writeUint8(i);
    for (var n = 0, s = 0; s < e.length; s++) {
        var o = e.charCodeAt(s), l = null;
        if ((48 <= o && o <= 57 ? (l = o - 48) : 255 === t ? (45 === o ? (l = 10) : 46 === o && (l = 11)) : 251 === t && 65 <= o && o <= 70 && (l = o - 55), null == l))
            throw new Error(`Cannot nibble encode ${o}`);
        s % 2 == 0 ? ((n = l << 4), s === e.length - 1 && ((n |= 15), r.writeUint8(n))) : ((n |= l), r.writeUint8(n));
    }
}
function N(e, t) {
    if (e < 256)
        t.writeUint8(252), t.writeUint8(e);
    else if (e < 1048576)
        t.writeUint8(253), t.writeUint8((e >>> 16) & 255), t.writeUint8((e >>> 8) & 255), t.writeUint8(255 & e);
    else {
        if (!(e < 4294967296))
            throw new Error(`Binary with length ${e} is too big for WAP protocol`);
        t.writeUint8(254), t.writeUint32(e);
    }
}
function R(e, t) {
    var w = null;
    if ('' === e)
        return t.writeUint8(252), void t.writeUint8(0);
    var b = Constants_1.SINGLE_BYTE_TOKEN_MAP;
    var r = b.get(e);
    var c = [236, 237, 238, 239];
    if (null == r) {
        if (null == w) {
            w = [];
            for (var a = 0; a < Constants_1.DICTIONARIES_MAP.length; ++a)
                w.push(Constants_1.DICTIONARIES_MAP[a]);
        }
        for (var n = 0; n < w.length; ++n) {
            var s = w[n].get(e);
            if (null != s)
                return t.writeUint8(c[n]), void t.writeUint8(s);
        }
        var o = Binary_1.numUtf8Bytes(e);
        if (o < 128) {
            if (!/[^0-9.-]+?/.exec(e))
                return void D(e, 255, t);
            if (!/[^0-9A-F]+?/.exec(e))
                return void D(e, 251, t);
        }
        N(o, t), t.writeString(e);
    }
    else
        t.writeUint8(r + 1);
}
function M(e, t) {
    var p = 248;
    var f = 249;
    if (void 0 === e.tag)
        return t.writeUint8(p), void t.writeUint8(0);
    var r = 1;
    e.attrs && (r += 2 * Object.keys(e.attrs).length),
        e.content && r++,
        r < 256 ? (t.writeUint8(p), t.writeUint8(r)) : r < 65536 && (t.writeUint8(f), t.writeUint16(r)),
        O(e.tag, t),
        e.attrs &&
            Object.keys(e.attrs).forEach((r) => {
                R(r, t), O(e.attrs[r], t);
            });
    var a = e.content;
    if (Array.isArray(a)) {
        a.length < 256 ? (t.writeUint8(p), t.writeUint8(a.length)) : a.length < 65536 && (t.writeUint8(f), t.writeUint16(a.length));
        for (var i = 0; i < a.length; i++)
            M(a[i], t);
    }
    else
        a && O(a, t);
}
function L(data, t) {
    const n = data.readUint8();
    if (n === 0) {
        return null;
    }
    if (n === 248) {
        return k(data, data.readUint8());
    }
    if (n === 249) {
        return k(data, data.readUint16());
    }
    if (n === 252) {
        return t ? data.readString(data.readUint8()) : data.readByteArray(data.readUint8());
    }
    if (n === 253) {
        const size = ((15 & data.readUint8()) << 16) + (data.readUint8() << 8) + data.readUint8();
        return t ? data.readString(size) : data.readByteArray(size);
    }
    if (n === 254) {
        return t ? data.readString(data.readUint32()) : data.readByteArray(data.readUint32());
    }
    if (n === 250) {
        const user = L(data, true);
        if (null != user && 'string' != typeof user)
            throw new Error(`Decode string got invalid value ${String(t)}, string expected`);
        const server = decodeStanzaString(data);
        return jid_utils_1.jidEncode(user, server);
    }
    if (n === 247) {
        const agent = data.readUint8();
        const device = data.readUint8();
        const user = decodeStanzaString(data);
        return jid_utils_1.jidEncode(user, 's.whatsapp.net', device, agent);
    }
    if (n === 255) {
        const number = data.readUint8();
        return x(data, LIST1, number >>> 7, 127 & number);
    }
    if (n === 251) {
        const number = data.readUint8();
        return x(data, LIST2, number >>> 7, 127 & number);
    }
    if (n <= 0 || n >= 240) {
        throw new Error('Unable to decode WAP buffer');
    }
    if (n >= 236 && n <= 239) {
        const dict = Constants_1.DICTIONARIES[n - 236];
        if (!dict) {
            throw new Error(`Missing WAP dictionary ${n - 236}`);
        }
        const index = data.readUint8();
        const value = dict[index];
        if (!value) {
            throw new Error(`Invalid value index ${index} in dict ${n - 236}`);
        }
        return value;
    }
    const singleToken = Constants_1.SINGLE_BYTE_TOKEN[n - 1];
    if (!singleToken)
        throw new Error(`Undefined token with index ${n}`);
    return singleToken;
}
function O(e, t) {
    if (null == e)
        t.writeUint8(0);
    else if (typeof e === 'object' && !(e instanceof Uint8Array) && !Buffer.isBuffer(e) && !Array.isArray(e))
        M(e, t);
    else if ('string' == typeof e) {
        const jid = jid_utils_1.jidDecode(e);
        if (jid) {
            if (typeof jid.agent !== 'undefined' || typeof jid.device !== 'undefined') {
                var { user: a, agent: i, device: n } = jid;
                t.writeUint8(247), t.writeUint8(i || 0), t.writeUint8(n || 0), O(a, t);
            }
            else {
                var { user: s, server: l } = jid;
                t.writeUint8(250), null != s ? O(s, t) : t.writeUint8(0), O(l, t);
            }
        }
        else {
            R(e, t);
        }
    }
    else {
        if (!(e instanceof Uint8Array))
            throw new Error('Invalid payload type ' + typeof e);
        N(e.length, t), t.writeByteArray(e);
    }
}
function decodeStanzaString(data) {
    // G
    const t = L(data, true);
    if (typeof t != 'string') {
        throw new Error(`Decode string got invalid value ${String(t)}, string expected`);
    }
    return t;
}
function bufferToUInt(e, t) {
    let a = 0;
    for (let i = 0; i < t; i++)
        a = 256 * a + e[i];
    return a;
}
const decodeBinaryNode = (data) => {
    //U
    let r = data.readUint8();
    let t = r === 248 ? data.readUint8() : data.readUint16();
    if (!t) {
        throw new Error('Failed to decode node, list cannot be empty');
    }
    const a = {};
    const n = decodeStanzaString(data);
    for (t -= 1; t > 1;) {
        const s = decodeStanzaString(data);
        const l = L(data, true);
        a[s] = l;
        t -= 2;
    }
    let i = null;
    1 === t && jid_utils_1.jidDecode(i = L(data, !1)) && (i = String(i));
    return {
        tag: n,
        attrs: a,
        content: i
    };
};
exports.decodeBinaryNode = decodeBinaryNode;
const encodeBinaryNode = (node) => {
    const data = new Binary_1.Binary();
    O(node, data);
    const dataArr = data.readByteArray();
    const result = new Uint8Array(1 + dataArr.length);
    result[0] = 0;
    result.set(dataArr, 1);
    return result;
};
exports.encodeBinaryNode = encodeBinaryNode;
// some extra useful utilities
const getBinaryNodeChildren = ({ content }, childTag) => {
    if (Array.isArray(content)) {
        return content.filter(item => item.tag == childTag);
    }
    return [];
};
exports.getBinaryNodeChildren = getBinaryNodeChildren;
const getAllBinaryNodeChildren = ({ content }) => {
    if (Array.isArray(content)) {
        return content;
    }
    return [];
};
exports.getAllBinaryNodeChildren = getAllBinaryNodeChildren;
const getBinaryNodeChild = ({ content }, childTag) => {
    if (Array.isArray(content)) {
        return content.find(item => item.tag == childTag);
    }
};
exports.getBinaryNodeChild = getBinaryNodeChild;
const getBinaryNodeChildBuffer = (node, childTag) => {
    var _a;
    const child = (_a = exports.getBinaryNodeChild(node, childTag)) === null || _a === void 0 ? void 0 : _a.content;
    if (Buffer.isBuffer(child) || child instanceof Uint8Array) {
        return child;
    }
};
exports.getBinaryNodeChildBuffer = getBinaryNodeChildBuffer;
const getBinaryNodeChildUInt = (node, childTag, length) => {
    const buff = exports.getBinaryNodeChildBuffer(node, childTag);
    if (buff)
        return bufferToUInt(buff, length);
};
exports.getBinaryNodeChildUInt = getBinaryNodeChildUInt;
const assertNodeErrorFree = (node) => {
    const errNode = exports.getBinaryNodeChild(node, 'error');
    if (errNode) {
        throw new boom_1.Boom(errNode.attrs.text || 'Unknown error', { data: +errNode.attrs.code });
    }
};
exports.assertNodeErrorFree = assertNodeErrorFree;
const reduceBinaryNodeToDictionary = (node, tag) => {
    const nodes = exports.getBinaryNodeChildren(node, tag);
    const dict = nodes.reduce((dict, { attrs }) => {
        dict[attrs.name || attrs.config_code] = attrs.value || attrs.config_value;
        return dict;
    }, {});
    return dict;
};
exports.reduceBinaryNodeToDictionary = reduceBinaryNodeToDictionary;
const getBinaryNodeMessages = ({ content }) => {
    const msgs = [];
    if (Array.isArray(content)) {
        for (const item of content) {
            if (item.tag === 'message') {
                msgs.push(WAProto_1.proto.WebMessageInfo.decode(item.content));
            }
        }
    }
    return msgs;
};
exports.getBinaryNodeMessages = getBinaryNodeMessages;
__exportStar(require("./generic-utils"), exports);
__exportStar(require("./jid-utils"), exports);
var Binary_2 = require("../../WABinary/Binary");
Object.defineProperty(exports, "Binary", { enumerable: true, get: function () { return Binary_2.Binary; } });
__exportStar(require("./types"), exports);
__exportStar(require("./Legacy"), exports);
