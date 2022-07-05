"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeNoiseHandler = void 0;
const boom_1 = require("@hapi/boom");
const crypto_1 = require("crypto");
const WAProto_1 = require("../../WAProto");
const Defaults_1 = require("../Defaults");
const WABinary_1 = require("../WABinary");
const WABinary_2 = require("../WABinary");
const crypto_2 = require("./crypto");
const generateIV = (counter) => {
    const iv = new ArrayBuffer(12);
    new DataView(iv).setUint32(8, counter);
    return new Uint8Array(iv);
};
const makeNoiseHandler = ({ public: publicKey, private: privateKey }) => {
    const authenticate = (data) => {
        if (!isFinished) {
            hash = crypto_2.sha256(Buffer.from(WABinary_1.Binary.build(hash, data).readByteArray()));
        }
    };
    const encrypt = (plaintext) => {
        const authTagLength = 128 >> 3;
        const cipher = crypto_1.createCipheriv('aes-256-gcm', encKey, generateIV(writeCounter), { authTagLength });
        cipher.setAAD(hash);
        const result = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
        writeCounter += 1;
        authenticate(result);
        return result;
    };
    const decrypt = (ciphertext) => {
        // before the handshake is finished, we use the same counter
        // after handshake, the counters are different
        const iv = generateIV(isFinished ? readCounter : writeCounter);
        const cipher = crypto_1.createDecipheriv('aes-256-gcm', decKey, iv);
        // decrypt additional adata
        const tagLength = 128 >> 3;
        const enc = ciphertext.slice(0, ciphertext.length - tagLength);
        const tag = ciphertext.slice(ciphertext.length - tagLength);
        // set additional data
        cipher.setAAD(hash);
        cipher.setAuthTag(tag);
        const result = Buffer.concat([cipher.update(enc), cipher.final()]);
        if (isFinished) {
            readCounter += 1;
        }
        else {
            writeCounter += 1;
        }
        authenticate(ciphertext);
        return result;
    };
    const localHKDF = (data) => {
        const key = crypto_2.hkdf(Buffer.from(data), 64, { salt, info: '' });
        return [key.slice(0, 32), key.slice(32)];
    };
    const mixIntoKey = (data) => {
        const [write, read] = localHKDF(data);
        salt = write;
        encKey = read;
        decKey = read;
        readCounter = 0;
        writeCounter = 0;
    };
    const finishInit = () => {
        const [write, read] = localHKDF(new Uint8Array(0));
        encKey = write;
        decKey = read;
        hash = Buffer.from([]);
        readCounter = 0;
        writeCounter = 0;
        isFinished = true;
    };
    const data = WABinary_1.Binary.build(Defaults_1.NOISE_MODE).readBuffer();
    let hash = Buffer.from(data.byteLength === 32 ? data : crypto_2.sha256(Buffer.from(data)));
    let salt = hash;
    let encKey = hash;
    let decKey = hash;
    let readCounter = 0;
    let writeCounter = 0;
    let isFinished = false;
    let sentIntro = false;
    const outBinary = new WABinary_1.Binary();
    const inBinary = new WABinary_1.Binary();
    authenticate(Defaults_1.NOISE_WA_HEADER);
    authenticate(publicKey);
    return {
        encrypt,
        decrypt,
        authenticate,
        mixIntoKey,
        finishInit,
        processHandshake: ({ serverHello }, noiseKey) => {
            authenticate(serverHello.ephemeral);
            mixIntoKey(crypto_2.Curve.sharedKey(privateKey, serverHello.ephemeral));
            const decStaticContent = decrypt(serverHello.static);
            mixIntoKey(crypto_2.Curve.sharedKey(privateKey, decStaticContent));
            const certDecoded = decrypt(serverHello.payload);
            const { details: certDetails, signature: certSignature } = WAProto_1.proto.NoiseCertificate.decode(certDecoded);
            const { key: certKey } = WAProto_1.proto.NoiseCertificateDetails.decode(certDetails);
            if (Buffer.compare(decStaticContent, certKey) !== 0) {
                throw new boom_1.Boom('certification match failed', { statusCode: 400 });
            }
            const keyEnc = encrypt(noiseKey.public);
            mixIntoKey(crypto_2.Curve.sharedKey(noiseKey.private, serverHello.ephemeral));
            return keyEnc;
        },
        encodeFrame: (data) => {
            if (isFinished) {
                data = encrypt(data);
            }
            const introSize = sentIntro ? 0 : Defaults_1.NOISE_WA_HEADER.length;
            outBinary.ensureAdditionalCapacity(introSize + 3 + data.byteLength);
            if (!sentIntro) {
                outBinary.writeByteArray(Defaults_1.NOISE_WA_HEADER);
                sentIntro = true;
            }
            outBinary.writeUint8(data.byteLength >> 16);
            outBinary.writeUint16(65535 & data.byteLength);
            outBinary.write(data);
            const bytes = outBinary.readByteArray();
            return bytes;
        },
        decodeFrame: (newData, onFrame) => {
            // the binary protocol uses its own framing mechanism
            // on top of the WS frames
            // so we get this data and separate out the frames
            const getBytesSize = () => {
                return (inBinary.readUint8() << 16) | inBinary.readUint16();
            };
            const peekSize = () => {
                return !(inBinary.size() < 3) && getBytesSize() <= inBinary.size();
            };
            inBinary.writeByteArray(newData);
            while (inBinary.peek(peekSize)) {
                const bytes = getBytesSize();
                let frame = inBinary.readByteArray(bytes);
                if (isFinished) {
                    const result = decrypt(frame);
                    const unpacked = new WABinary_1.Binary(result).decompressed();
                    frame = WABinary_2.decodeBinaryNode(unpacked);
                }
                onFrame(frame);
            }
            inBinary.peek(peekSize);
        }
    };
};
exports.makeNoiseHandler = makeNoiseHandler;
