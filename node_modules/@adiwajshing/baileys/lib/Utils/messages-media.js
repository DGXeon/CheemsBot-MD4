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
exports.getWAUploadToServer = exports.extensionForMediaMessage = exports.downloadContentFromMessage = exports.encryptedStream = exports.getHttpStream = exports.generateThumbnail = exports.getStream = exports.toBuffer = exports.toReadable = exports.getAudioDuration = exports.mediaMessageSHA256B64 = exports.generateProfilePicture = exports.extractImageThumb = exports.getMediaKeys = exports.hkdfInfoKey = void 0;
const boom_1 = require("@hapi/boom");
const child_process_1 = require("child_process");
const Crypto = __importStar(require("crypto"));
const events_1 = require("events");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const stream_1 = require("stream");
const Defaults_1 = require("../Defaults");
const crypto_1 = require("./crypto");
const generics_1 = require("./generics");
const getTmpFilesDirectory = () => os_1.tmpdir();
const getImageProcessingLibrary = async () => {
    const [jimp, sharp] = await Promise.all([
        (async () => {
            const jimp = await (Promise.resolve().then(() => __importStar(require('jimp'))).catch(() => { }));
            return jimp;
        })(),
        (async () => {
            const sharp = await (Promise.resolve().then(() => __importStar(require('sharp'))).catch(() => { }));
            return sharp;
        })()
    ]);
    if (sharp) {
        return { sharp };
    }
    if (jimp) {
        return { jimp };
    }
    throw new boom_1.Boom('No image processing library available');
};
const hkdfInfoKey = (type) => {
    let str = type;
    if (type === 'sticker') {
        str = 'image';
    }
    if (type === 'md-app-state') {
        str = 'App State';
    }
    const hkdfInfo = str[0].toUpperCase() + str.slice(1);
    return `WhatsApp ${hkdfInfo} Keys`;
};
exports.hkdfInfoKey = hkdfInfoKey;
/** generates all the keys required to encrypt/decrypt & sign a media message */
function getMediaKeys(buffer, mediaType) {
    if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer.replace('data:;base64,', ''), 'base64');
    }
    // expand using HKDF to 112 bytes, also pass in the relevant app info
    const expandedMediaKey = crypto_1.hkdf(buffer, 112, { info: exports.hkdfInfoKey(mediaType) });
    return {
        iv: expandedMediaKey.slice(0, 16),
        cipherKey: expandedMediaKey.slice(16, 48),
        macKey: expandedMediaKey.slice(48, 80),
    };
}
exports.getMediaKeys = getMediaKeys;
/** Extracts video thumb using FFMPEG */
const extractVideoThumb = async (path, destPath, time, size) => new Promise((resolve, reject) => {
    const cmd = `ffmpeg -ss ${time} -i ${path} -y -vf scale=${size.width}:-1 -vframes 1 -f image2 ${destPath}`;
    child_process_1.exec(cmd, (err) => {
        if (err) {
            reject(err);
        }
        else {
            resolve();
        }
    });
});
const extractImageThumb = async (bufferOrFilePath) => {
    if (bufferOrFilePath instanceof stream_1.Readable) {
        bufferOrFilePath = await exports.toBuffer(bufferOrFilePath);
    }
    const lib = await getImageProcessingLibrary();
    if ('sharp' in lib) {
        const result = await lib.sharp.default(bufferOrFilePath)
            .resize(32)
            .jpeg({ quality: 50 })
            .toBuffer();
        return result;
    }
    else {
        const { read, MIME_JPEG, RESIZE_BILINEAR, AUTO } = lib.jimp;
        const jimp = await read(bufferOrFilePath);
        const result = await jimp
            .quality(50)
            .resize(32, AUTO, RESIZE_BILINEAR)
            .getBufferAsync(MIME_JPEG);
        return result;
    }
};
exports.extractImageThumb = extractImageThumb;
const generateProfilePicture = async (mediaUpload) => {
    let bufferOrFilePath;
    if (Buffer.isBuffer(mediaUpload)) {
        bufferOrFilePath = mediaUpload;
    }
    else if ('url' in mediaUpload) {
        bufferOrFilePath = mediaUpload.url.toString();
    }
    else {
        bufferOrFilePath = await exports.toBuffer(mediaUpload.stream);
    }
    const lib = await getImageProcessingLibrary();
    let img;
    if ('sharp' in lib) {
        img = lib.sharp.default(bufferOrFilePath)
            .resize(640, 640)
            .jpeg({
            quality: 50,
        })
            .toBuffer();
    }
    else {
        const { read, MIME_JPEG, RESIZE_BILINEAR } = lib.jimp;
        const jimp = await read(bufferOrFilePath);
        const min = Math.min(jimp.getWidth(), jimp.getHeight());
        const cropped = jimp.crop(0, 0, min, min);
        img = cropped
            .quality(50)
            .resize(640, 640, RESIZE_BILINEAR)
            .getBufferAsync(MIME_JPEG);
    }
    return {
        img: await img,
    };
};
exports.generateProfilePicture = generateProfilePicture;
/** gets the SHA256 of the given media message */
const mediaMessageSHA256B64 = (message) => {
    const media = Object.values(message)[0];
    return (media === null || media === void 0 ? void 0 : media.fileSha256) && Buffer.from(media.fileSha256).toString('base64');
};
exports.mediaMessageSHA256B64 = mediaMessageSHA256B64;
async function getAudioDuration(buffer) {
    const musicMetadata = await Promise.resolve().then(() => __importStar(require('music-metadata')));
    let metadata;
    if (Buffer.isBuffer(buffer)) {
        metadata = await musicMetadata.parseBuffer(buffer, null, { duration: true });
    }
    else if (typeof buffer === 'string') {
        const rStream = fs_1.createReadStream(buffer);
        metadata = await musicMetadata.parseStream(rStream, null, { duration: true });
        rStream.close();
    }
    else {
        metadata = await musicMetadata.parseStream(buffer, null, { duration: true });
    }
    return metadata.format.duration;
}
exports.getAudioDuration = getAudioDuration;
const toReadable = (buffer) => {
    const readable = new stream_1.Readable({ read: () => { } });
    readable.push(buffer);
    readable.push(null);
    return readable;
};
exports.toReadable = toReadable;
const toBuffer = async (stream) => {
    let buff = Buffer.alloc(0);
    for await (const chunk of stream) {
        buff = Buffer.concat([buff, chunk]);
    }
    return buff;
};
exports.toBuffer = toBuffer;
const getStream = async (item) => {
    if (Buffer.isBuffer(item)) {
        return { stream: exports.toReadable(item), type: 'buffer' };
    }
    if ('stream' in item) {
        return { stream: item.stream, type: 'readable' };
    }
    if (item.url.toString().startsWith('http://') || item.url.toString().startsWith('https://')) {
        return { stream: await exports.getHttpStream(item.url), type: 'remote' };
    }
    return { stream: fs_1.createReadStream(item.url), type: 'file' };
};
exports.getStream = getStream;
/** generates a thumbnail for a given media, if required */
async function generateThumbnail(file, mediaType, options) {
    var _a;
    let thumbnail;
    if (mediaType === 'image') {
        const buff = await exports.extractImageThumb(file);
        thumbnail = buff.toString('base64');
    }
    else if (mediaType === 'video') {
        const imgFilename = path_1.join(getTmpFilesDirectory(), generics_1.generateMessageID() + '.jpg');
        try {
            await extractVideoThumb(file, imgFilename, '00:00:00', { width: 32, height: 32 });
            const buff = await fs_1.promises.readFile(imgFilename);
            thumbnail = buff.toString('base64');
            await fs_1.promises.unlink(imgFilename);
        }
        catch (err) {
            (_a = options.logger) === null || _a === void 0 ? void 0 : _a.debug('could not generate video thumb: ' + err);
        }
    }
    return thumbnail;
}
exports.generateThumbnail = generateThumbnail;
const getHttpStream = async (url, options = {}) => {
    const { default: axios } = await Promise.resolve().then(() => __importStar(require('axios')));
    const fetched = await axios.get(url.toString(), { ...options, responseType: 'stream' });
    return fetched.data;
};
exports.getHttpStream = getHttpStream;
const encryptedStream = async (media, mediaType, saveOriginalFileIfRequired = true, logger) => {
    const { stream, type } = await exports.getStream(media);
    logger === null || logger === void 0 ? void 0 : logger.debug('fetched media stream');
    const mediaKey = Crypto.randomBytes(32);
    const { cipherKey, iv, macKey } = getMediaKeys(mediaKey, mediaType);
    // random name
    //const encBodyPath = join(getTmpFilesDirectory(), mediaType + generateMessageID() + '.enc')
    // const encWriteStream = createWriteStream(encBodyPath)
    const encWriteStream = new stream_1.Readable({ read: () => { } });
    let bodyPath;
    let writeStream;
    let didSaveToTmpPath = false;
    if (type === 'file') {
        bodyPath = media.url;
    }
    else if (saveOriginalFileIfRequired) {
        bodyPath = path_1.join(getTmpFilesDirectory(), mediaType + generics_1.generateMessageID());
        writeStream = fs_1.createWriteStream(bodyPath);
        didSaveToTmpPath = true;
    }
    let fileLength = 0;
    const aes = Crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
    let hmac = Crypto.createHmac('sha256', macKey).update(iv);
    let sha256Plain = Crypto.createHash('sha256');
    let sha256Enc = Crypto.createHash('sha256');
    const onChunk = (buff) => {
        sha256Enc = sha256Enc.update(buff);
        hmac = hmac.update(buff);
        encWriteStream.push(buff);
    };
    try {
        for await (const data of stream) {
            fileLength += data.length;
            sha256Plain = sha256Plain.update(data);
            if (writeStream) {
                if (!writeStream.write(data)) {
                    await events_1.once(writeStream, 'drain');
                }
            }
            onChunk(aes.update(data));
        }
        onChunk(aes.final());
        const mac = hmac.digest().slice(0, 10);
        sha256Enc = sha256Enc.update(mac);
        const fileSha256 = sha256Plain.digest();
        const fileEncSha256 = sha256Enc.digest();
        encWriteStream.push(mac);
        encWriteStream.push(null);
        writeStream && writeStream.end();
        stream.destroy();
        logger === null || logger === void 0 ? void 0 : logger.debug('encrypted data successfully');
        return {
            mediaKey,
            encWriteStream,
            bodyPath,
            mac,
            fileEncSha256,
            fileSha256,
            fileLength,
            didSaveToTmpPath
        };
    }
    catch (error) {
        encWriteStream.destroy(error);
        writeStream.destroy(error);
        aes.destroy(error);
        hmac.destroy(error);
        sha256Plain.destroy(error);
        sha256Enc.destroy(error);
        stream.destroy(error);
        throw error;
    }
};
exports.encryptedStream = encryptedStream;
const DEF_HOST = 'mmg.whatsapp.net';
const AES_CHUNK_SIZE = 16;
const toSmallestChunkSize = (num) => {
    return Math.floor(num / AES_CHUNK_SIZE) * AES_CHUNK_SIZE;
};
const downloadContentFromMessage = async ({ mediaKey, directPath, url }, type, { startByte, endByte } = {}) => {
    const downloadUrl = url || `https://${DEF_HOST}${directPath}`;
    let bytesFetched = 0;
    let startChunk = 0;
    let firstBlockIsIV = false;
    // if a start byte is specified -- then we need to fetch the previous chunk as that will form the IV
    if (startByte) {
        const chunk = toSmallestChunkSize(startByte || 0);
        if (chunk) {
            startChunk = chunk - AES_CHUNK_SIZE;
            bytesFetched = chunk;
            firstBlockIsIV = true;
        }
    }
    const endChunk = endByte ? toSmallestChunkSize(endByte || 0) + AES_CHUNK_SIZE : undefined;
    const headers = {
        Origin: Defaults_1.DEFAULT_ORIGIN,
    };
    if (startChunk || endChunk) {
        headers.Range = `bytes=${startChunk}-`;
        if (endChunk) {
            headers.Range += endChunk;
        }
    }
    // download the message
    const fetched = await exports.getHttpStream(downloadUrl, {
        headers,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });
    let remainingBytes = Buffer.from([]);
    const { cipherKey, iv } = getMediaKeys(mediaKey, type);
    let aes;
    const pushBytes = (bytes, push) => {
        if (startByte || endByte) {
            const start = bytesFetched >= startByte ? undefined : Math.max(startByte - bytesFetched, 0);
            const end = bytesFetched + bytes.length < endByte ? undefined : Math.max(endByte - bytesFetched, 0);
            push(bytes.slice(start, end));
            bytesFetched += bytes.length;
        }
        else {
            push(bytes);
        }
    };
    const output = new stream_1.Transform({
        transform(chunk, _, callback) {
            let data = Buffer.concat([remainingBytes, chunk]);
            const decryptLength = toSmallestChunkSize(data.length);
            remainingBytes = data.slice(decryptLength);
            data = data.slice(0, decryptLength);
            if (!aes) {
                let ivValue = iv;
                if (firstBlockIsIV) {
                    ivValue = data.slice(0, AES_CHUNK_SIZE);
                    data = data.slice(AES_CHUNK_SIZE);
                }
                aes = Crypto.createDecipheriv('aes-256-cbc', cipherKey, ivValue);
                // if an end byte that is not EOF is specified
                // stop auto padding (PKCS7) -- otherwise throws an error for decryption
                if (endByte) {
                    aes.setAutoPadding(false);
                }
            }
            try {
                pushBytes(aes.update(data), b => this.push(b));
                callback();
            }
            catch (error) {
                callback(error);
            }
        },
        final(callback) {
            try {
                pushBytes(aes.final(), b => this.push(b));
                callback();
            }
            catch (error) {
                callback(error);
            }
        },
    });
    return fetched.pipe(output, { end: true });
};
exports.downloadContentFromMessage = downloadContentFromMessage;
function extensionForMediaMessage(message) {
    const getExtension = (mimetype) => mimetype.split(';')[0].split('/')[1];
    const type = Object.keys(message)[0];
    let extension;
    if (type === 'locationMessage' ||
        type === 'liveLocationMessage' ||
        type === 'productMessage') {
        extension = '.jpeg';
    }
    else {
        const messageContent = message[type];
        extension = getExtension(messageContent.mimetype);
    }
    return extension;
}
exports.extensionForMediaMessage = extensionForMediaMessage;
const getWAUploadToServer = ({ customUploadHosts, fetchAgent, logger }, refreshMediaConn) => {
    return async (stream, { mediaType, fileEncSha256B64, timeoutMs }) => {
        var _a, _b;
        const { default: axios } = await Promise.resolve().then(() => __importStar(require('axios')));
        // send a query JSON to obtain the url & auth token to upload our media
        let uploadInfo = await refreshMediaConn(false);
        let urls;
        const hosts = [...customUploadHosts, ...uploadInfo.hosts];
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        let reqBody = Buffer.concat(chunks);
        for (const { hostname, maxContentLengthBytes } of hosts) {
            logger.debug(`uploading to "${hostname}"`);
            const auth = encodeURIComponent(uploadInfo.auth); // the auth token
            const url = `https://${hostname}${Defaults_1.MEDIA_PATH_MAP[mediaType]}/${fileEncSha256B64}?auth=${auth}&token=${fileEncSha256B64}`;
            let result;
            try {
                if (maxContentLengthBytes && reqBody.length > maxContentLengthBytes) {
                    throw new boom_1.Boom(`Body too large for "${hostname}"`, { statusCode: 413 });
                }
                const body = await axios.post(url, reqBody, {
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Origin': Defaults_1.DEFAULT_ORIGIN
                    },
                    httpsAgent: fetchAgent,
                    timeout: timeoutMs,
                    responseType: 'json',
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity,
                });
                result = body.data;
                if ((result === null || result === void 0 ? void 0 : result.url) || (result === null || result === void 0 ? void 0 : result.directPath)) {
                    urls = {
                        mediaUrl: result.url,
                        directPath: result.direct_path
                    };
                    break;
                }
                else {
                    uploadInfo = await refreshMediaConn(true);
                    throw new Error(`upload failed, reason: ${JSON.stringify(result)}`);
                }
            }
            catch (error) {
                if (axios.isAxiosError(error)) {
                    result = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data;
                }
                const isLast = hostname === ((_b = hosts[uploadInfo.hosts.length - 1]) === null || _b === void 0 ? void 0 : _b.hostname);
                logger.warn({ trace: error.stack, uploadResult: result }, `Error in uploading to ${hostname} ${isLast ? '' : ', retrying...'}`);
            }
        }
        // clear buffer just to be sure we're releasing the memory
        reqBody = undefined;
        if (!urls) {
            throw new boom_1.Boom('Media upload failed on all hosts', { statusCode: 500 });
        }
        return urls;
    };
};
exports.getWAUploadToServer = getWAUploadToServer;
