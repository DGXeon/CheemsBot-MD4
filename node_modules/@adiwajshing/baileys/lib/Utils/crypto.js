"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hkdf = exports.sha256 = exports.hmacSign = exports.aesEncrypWithIV = exports.aesEncrypt = exports.aesDecryptWithIV = exports.aesDecrypt = exports.signedKeyPair = exports.Curve = void 0;
const crypto_1 = require("crypto");
const curveJs = __importStar(require("curve25519-js"));
exports.Curve = {
    generateKeyPair: () => {
        const { public: pubKey, private: privKey } = curveJs.generateKeyPair(crypto_1.randomBytes(32));
        return {
            private: Buffer.from(privKey),
            public: Buffer.from(pubKey)
        };
    },
    sharedKey: (privateKey, publicKey) => {
        const shared = curveJs.sharedKey(privateKey, publicKey);
        return Buffer.from(shared);
    },
    sign: (privateKey, buf) => (Buffer.from(curveJs.sign(privateKey, buf, null))),
    verify: (pubKey, message, signature) => {
        return curveJs.verify(pubKey, message, signature);
    }
};
const signedKeyPair = (keyPair, keyId) => {
    const signKeys = exports.Curve.generateKeyPair();
    const pubKey = new Uint8Array(33);
    pubKey.set([5], 0);
    pubKey.set(signKeys.public, 1);
    const signature = exports.Curve.sign(keyPair.private, pubKey);
    return { keyPair: signKeys, signature, keyId };
};
exports.signedKeyPair = signedKeyPair;
/** decrypt AES 256 CBC; where the IV is prefixed to the buffer */
function aesDecrypt(buffer, key) {
    return aesDecryptWithIV(buffer.slice(16, buffer.length), key, buffer.slice(0, 16));
}
exports.aesDecrypt = aesDecrypt;
/** decrypt AES 256 CBC */
function aesDecryptWithIV(buffer, key, IV) {
    const aes = crypto_1.createDecipheriv('aes-256-cbc', key, IV);
    return Buffer.concat([aes.update(buffer), aes.final()]);
}
exports.aesDecryptWithIV = aesDecryptWithIV;
// encrypt AES 256 CBC; where a random IV is prefixed to the buffer
function aesEncrypt(buffer, key) {
    const IV = crypto_1.randomBytes(16);
    const aes = crypto_1.createCipheriv('aes-256-cbc', key, IV);
    return Buffer.concat([IV, aes.update(buffer), aes.final()]); // prefix IV to the buffer
}
exports.aesEncrypt = aesEncrypt;
// encrypt AES 256 CBC with a given IV
function aesEncrypWithIV(buffer, key, IV) {
    const aes = crypto_1.createCipheriv('aes-256-cbc', key, IV);
    return Buffer.concat([aes.update(buffer), aes.final()]); // prefix IV to the buffer
}
exports.aesEncrypWithIV = aesEncrypWithIV;
// sign HMAC using SHA 256
function hmacSign(buffer, key, variant = 'sha256') {
    return crypto_1.createHmac(variant, key).update(buffer).digest();
}
exports.hmacSign = hmacSign;
function sha256(buffer) {
    return crypto_1.createHash('sha256').update(buffer).digest();
}
exports.sha256 = sha256;
// HKDF key expansion
// from: https://github.com/benadida/node-hkdf
function hkdf(buffer, expandedLength, { info, salt }) {
    const hashAlg = 'sha256';
    const hashLength = 32;
    salt = salt || Buffer.alloc(hashLength);
    // now we compute the PRK
    const prk = crypto_1.createHmac(hashAlg, salt).update(buffer).digest();
    let prev = Buffer.from([]);
    const buffers = [];
    const num_blocks = Math.ceil(expandedLength / hashLength);
    const infoBuff = Buffer.from(info || []);
    for (var i = 0; i < num_blocks; i++) {
        const hmac = crypto_1.createHmac(hashAlg, prk);
        // XXX is there a more optimal way to build up buffers?
        const input = Buffer.concat([
            prev,
            infoBuff,
            Buffer.from(String.fromCharCode(i + 1))
        ]);
        hmac.update(input);
        prev = hmac.digest();
        buffers.push(prev);
    }
    return Buffer.concat(buffers, expandedLength);
}
exports.hkdf = hkdf;
