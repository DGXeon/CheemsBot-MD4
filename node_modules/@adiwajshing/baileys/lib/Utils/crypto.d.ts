/// <reference types="node" />
import { KeyPair } from '../Types';
export declare const Curve: {
    generateKeyPair: () => KeyPair;
    sharedKey: (privateKey: Uint8Array, publicKey: Uint8Array) => Buffer;
    sign: (privateKey: Uint8Array, buf: Uint8Array) => Buffer;
    verify: (pubKey: Uint8Array, message: Uint8Array, signature: Uint8Array) => boolean;
};
export declare const signedKeyPair: (keyPair: KeyPair, keyId: number) => {
    keyPair: KeyPair;
    signature: Buffer;
    keyId: number;
};
/** decrypt AES 256 CBC; where the IV is prefixed to the buffer */
export declare function aesDecrypt(buffer: Buffer, key: Buffer): Buffer;
/** decrypt AES 256 CBC */
export declare function aesDecryptWithIV(buffer: Buffer, key: Buffer, IV: Buffer): Buffer;
export declare function aesEncrypt(buffer: Buffer | Uint8Array, key: Buffer): Buffer;
export declare function aesEncrypWithIV(buffer: Buffer, key: Buffer, IV: Buffer): Buffer;
export declare function hmacSign(buffer: Buffer | Uint8Array, key: Buffer | Uint8Array, variant?: 'sha256' | 'sha512'): Buffer;
export declare function sha256(buffer: Buffer): Buffer;
export declare function hkdf(buffer: Uint8Array, expandedLength: number, { info, salt }: {
    salt?: Buffer;
    info?: string;
}): Buffer;
