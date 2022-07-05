"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeBinaryNodeLegacy = exports.encodeBinaryNodeLegacy = exports.isLegacyBinaryNode = void 0;
const constants_1 = require("./constants");
const isLegacyBinaryNode = (buffer) => {
    switch (buffer[0]) {
        case constants_1.Tags.LIST_EMPTY:
        case constants_1.Tags.LIST_8:
        case constants_1.Tags.LIST_16:
            return true;
        default:
            return false;
    }
};
exports.isLegacyBinaryNode = isLegacyBinaryNode;
function decode(buffer, indexRef) {
    const checkEOS = (length) => {
        if (indexRef.index + length > buffer.length) {
            throw new Error('end of stream');
        }
    };
    const next = () => {
        const value = buffer[indexRef.index];
        indexRef.index += 1;
        return value;
    };
    const readByte = () => {
        checkEOS(1);
        return next();
    };
    const readStringFromChars = (length) => {
        checkEOS(length);
        const value = buffer.slice(indexRef.index, indexRef.index + length);
        indexRef.index += length;
        return value.toString('utf-8');
    };
    const readBytes = (n) => {
        checkEOS(n);
        const value = buffer.slice(indexRef.index, indexRef.index + n);
        indexRef.index += n;
        return value;
    };
    const readInt = (n, littleEndian = false) => {
        checkEOS(n);
        let val = 0;
        for (let i = 0; i < n; i++) {
            const shift = littleEndian ? i : n - 1 - i;
            val |= next() << (shift * 8);
        }
        return val;
    };
    const readInt20 = () => {
        checkEOS(3);
        return ((next() & 15) << 16) + (next() << 8) + next();
    };
    const unpackHex = (value) => {
        if (value >= 0 && value < 16) {
            return value < 10 ? '0'.charCodeAt(0) + value : 'A'.charCodeAt(0) + value - 10;
        }
        throw new Error('invalid hex: ' + value);
    };
    const unpackNibble = (value) => {
        if (value >= 0 && value <= 9) {
            return '0'.charCodeAt(0) + value;
        }
        switch (value) {
            case 10:
                return '-'.charCodeAt(0);
            case 11:
                return '.'.charCodeAt(0);
            case 15:
                return '\0'.charCodeAt(0);
            default:
                throw new Error('invalid nibble: ' + value);
        }
    };
    const unpackByte = (tag, value) => {
        if (tag === constants_1.Tags.NIBBLE_8) {
            return unpackNibble(value);
        }
        else if (tag === constants_1.Tags.HEX_8) {
            return unpackHex(value);
        }
        else {
            throw new Error('unknown tag: ' + tag);
        }
    };
    const readPacked8 = (tag) => {
        const startByte = readByte();
        let value = '';
        for (let i = 0; i < (startByte & 127); i++) {
            const curByte = readByte();
            value += String.fromCharCode(unpackByte(tag, (curByte & 0xf0) >> 4));
            value += String.fromCharCode(unpackByte(tag, curByte & 0x0f));
        }
        if (startByte >> 7 !== 0) {
            value = value.slice(0, -1);
        }
        return value;
    };
    const isListTag = (tag) => {
        return tag === constants_1.Tags.LIST_EMPTY || tag === constants_1.Tags.LIST_8 || tag === constants_1.Tags.LIST_16;
    };
    const readListSize = (tag) => {
        switch (tag) {
            case constants_1.Tags.LIST_EMPTY:
                return 0;
            case constants_1.Tags.LIST_8:
                return readByte();
            case constants_1.Tags.LIST_16:
                return readInt(2);
            default:
                throw new Error('invalid tag for list size: ' + tag);
        }
    };
    const getToken = (index) => {
        if (index < 3 || index >= constants_1.SingleByteTokens.length) {
            throw new Error('invalid token index: ' + index);
        }
        return constants_1.SingleByteTokens[index];
    };
    const readString = (tag) => {
        if (tag >= 3 && tag <= 235) {
            const token = getToken(tag);
            return token; // === 's.whatsapp.net' ? 'c.us' : token
        }
        switch (tag) {
            case constants_1.Tags.DICTIONARY_0:
            case constants_1.Tags.DICTIONARY_1:
            case constants_1.Tags.DICTIONARY_2:
            case constants_1.Tags.DICTIONARY_3:
                return getTokenDouble(tag - constants_1.Tags.DICTIONARY_0, readByte());
            case constants_1.Tags.LIST_EMPTY:
                return null;
            case constants_1.Tags.BINARY_8:
                return readStringFromChars(readByte());
            case constants_1.Tags.BINARY_20:
                return readStringFromChars(readInt20());
            case constants_1.Tags.BINARY_32:
                return readStringFromChars(readInt(4));
            case constants_1.Tags.JID_PAIR:
                const i = readString(readByte());
                const j = readString(readByte());
                if (typeof i === 'string' && j) {
                    return i + '@' + j;
                }
                throw new Error('invalid jid pair: ' + i + ', ' + j);
            case constants_1.Tags.HEX_8:
            case constants_1.Tags.NIBBLE_8:
                return readPacked8(tag);
            default:
                throw new Error('invalid string with tag: ' + tag);
        }
    };
    const readList = (tag) => ([...new Array(readListSize(tag))].map(() => decode(buffer, indexRef)));
    const getTokenDouble = (index1, index2) => {
        const n = 256 * index1 + index2;
        if (n < 0 || n > constants_1.DoubleByteTokens.length) {
            throw new Error('invalid double token index: ' + n);
        }
        return constants_1.DoubleByteTokens[n];
    };
    const listSize = readListSize(readByte());
    const descrTag = readByte();
    if (descrTag === constants_1.Tags.STREAM_END) {
        throw new Error('unexpected stream end');
    }
    const header = readString(descrTag);
    const attrs = {};
    let data;
    if (listSize === 0 || !header) {
        throw new Error('invalid node');
    }
    // read the attributes in
    const attributesLength = (listSize - 1) >> 1;
    for (let i = 0; i < attributesLength; i++) {
        const key = readString(readByte());
        const b = readByte();
        attrs[key] = readString(b);
    }
    if (listSize % 2 === 0) {
        const tag = readByte();
        if (isListTag(tag)) {
            data = readList(tag);
        }
        else {
            let decoded;
            switch (tag) {
                case constants_1.Tags.BINARY_8:
                    decoded = readBytes(readByte());
                    break;
                case constants_1.Tags.BINARY_20:
                    decoded = readBytes(readInt20());
                    break;
                case constants_1.Tags.BINARY_32:
                    decoded = readBytes(readInt(4));
                    break;
                default:
                    decoded = readString(tag);
                    break;
            }
            data = decoded;
        }
    }
    return {
        tag: header,
        attrs,
        content: data
    };
}
const encode = ({ tag, attrs, content }, buffer = []) => {
    const pushByte = (value) => buffer.push(value & 0xff);
    const pushInt = (value, n, littleEndian = false) => {
        for (let i = 0; i < n; i++) {
            const curShift = littleEndian ? i : n - 1 - i;
            buffer.push((value >> (curShift * 8)) & 0xff);
        }
    };
    const pushBytes = (bytes) => (bytes.forEach(b => buffer.push(b)));
    const pushInt20 = (value) => (pushBytes([(value >> 16) & 0x0f, (value >> 8) & 0xff, value & 0xff]));
    const writeByteLength = (length) => {
        if (length >= 4294967296) {
            throw new Error('string too large to encode: ' + length);
        }
        if (length >= 1 << 20) {
            pushByte(constants_1.Tags.BINARY_32);
            pushInt(length, 4); // 32 bit integer
        }
        else if (length >= 256) {
            pushByte(constants_1.Tags.BINARY_20);
            pushInt20(length);
        }
        else {
            pushByte(constants_1.Tags.BINARY_8);
            pushByte(length);
        }
    };
    const writeStringRaw = (str) => {
        const bytes = Buffer.from(str, 'utf-8');
        writeByteLength(bytes.length);
        pushBytes(bytes);
    };
    const writeToken = (token) => {
        if (token < 245) {
            pushByte(token);
        }
        else if (token <= 500) {
            throw new Error('invalid token');
        }
    };
    const writeString = (token, i) => {
        if (token === 'c.us') {
            token = 's.whatsapp.net';
        }
        const tokenIndex = constants_1.SingleByteTokens.indexOf(token);
        if (!i && token === 's.whatsapp.net') {
            writeToken(tokenIndex);
        }
        else if (tokenIndex >= 0) {
            if (tokenIndex < constants_1.Tags.SINGLE_BYTE_MAX) {
                writeToken(tokenIndex);
            }
            else {
                const overflow = tokenIndex - constants_1.Tags.SINGLE_BYTE_MAX;
                const dictionaryIndex = overflow >> 8;
                if (dictionaryIndex < 0 || dictionaryIndex > 3) {
                    throw new Error('double byte dict token out of range: ' + token + ', ' + tokenIndex);
                }
                writeToken(constants_1.Tags.DICTIONARY_0 + dictionaryIndex);
                writeToken(overflow % 256);
            }
        }
        else if (token) {
            const jidSepIndex = token.indexOf('@');
            if (jidSepIndex <= 0) {
                writeStringRaw(token);
            }
            else {
                writeJid(token.slice(0, jidSepIndex), token.slice(jidSepIndex + 1, token.length));
            }
        }
    };
    const writeJid = (left, right) => {
        pushByte(constants_1.Tags.JID_PAIR);
        left && left.length > 0 ? writeString(left) : writeToken(constants_1.Tags.LIST_EMPTY);
        writeString(right);
    };
    const writeListStart = (listSize) => {
        if (listSize === 0) {
            pushByte(constants_1.Tags.LIST_EMPTY);
        }
        else if (listSize < 256) {
            pushBytes([constants_1.Tags.LIST_8, listSize]);
        }
        else {
            pushBytes([constants_1.Tags.LIST_16, listSize]);
        }
    };
    const validAttributes = Object.keys(attrs).filter(k => (typeof attrs[k] !== 'undefined' && attrs[k] !== null));
    writeListStart(2 * validAttributes.length + 1 + (typeof content !== 'undefined' && content !== null ? 1 : 0));
    writeString(tag);
    validAttributes.forEach((key) => {
        if (typeof attrs[key] === 'string') {
            writeString(key);
            writeString(attrs[key]);
        }
    });
    if (typeof content === 'string') {
        writeString(content, true);
    }
    else if (Buffer.isBuffer(content)) {
        writeByteLength(content.length);
        pushBytes(content);
    }
    else if (Array.isArray(content)) {
        writeListStart(content.length);
        for (const item of content) {
            if (item) {
                encode(item, buffer);
            }
        }
    }
    else if (typeof content === 'undefined' || content === null) {
    }
    else {
        throw new Error(`invalid children for header "${tag}": ${content} (${typeof content})`);
    }
    return Buffer.from(buffer);
};
exports.encodeBinaryNodeLegacy = encode;
exports.decodeBinaryNodeLegacy = decode;
