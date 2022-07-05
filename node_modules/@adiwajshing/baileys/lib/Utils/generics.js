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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatusFromReceiptType = exports.fetchLatestBaileysVersion = exports.printQRIfNecessaryListener = exports.bindWaitForConnectionUpdate = exports.generateMessageID = exports.promiseTimeout = exports.delayCancellable = exports.delay = exports.debouncedTimeout = exports.unixTimestampSeconds = exports.shallowChanges = exports.toNumber = exports.encodeBigEndian = exports.encodeInt = exports.generateRegistrationId = exports.encodeWAMessage = exports.unpadRandomMax16 = exports.writeRandomPadMax16 = exports.BufferJSON = exports.Browsers = void 0;
const boom_1 = require("@hapi/boom");
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const os_1 = require("os");
const WAProto_1 = require("../../WAProto");
const baileys_version_json_1 = require("../Defaults/baileys-version.json");
const Types_1 = require("../Types");
const WABinary_1 = require("../WABinary");
const PLATFORM_MAP = {
    'aix': 'AIX',
    'darwin': 'Mac OS',
    'win32': 'Windows',
    'android': 'Android'
};
exports.Browsers = {
    ubuntu: browser => ['Ubuntu', browser, '20.0.04'],
    macOS: browser => ['Mac OS', browser, '10.15.7'],
    baileys: browser => ['Baileys', browser, '4.0.0'],
    /** The appropriate browser based on your OS & release */
    appropriate: browser => [PLATFORM_MAP[os_1.platform()] || 'Ubuntu', browser, os_1.release()]
};
exports.BufferJSON = {
    replacer: (k, value) => {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array || (value === null || value === void 0 ? void 0 : value.type) === 'Buffer') {
            return { type: 'Buffer', data: Buffer.from((value === null || value === void 0 ? void 0 : value.data) || value).toString('base64') };
        }
        return value;
    },
    reviver: (_, value) => {
        if (typeof value === 'object' && !!value && (value.buffer === true || value.type === 'Buffer')) {
            const val = value.data || value.value;
            return typeof val === 'string' ? Buffer.from(val, 'base64') : Buffer.from(val || []);
        }
        return value;
    }
};
const writeRandomPadMax16 = (e) => {
    function r(e, t) {
        for (var r = 0; r < t; r++) {
            e.writeUint8(t);
        }
    }
    var t = crypto_1.randomBytes(1);
    r(e, 1 + (15 & t[0]));
    return e;
};
exports.writeRandomPadMax16 = writeRandomPadMax16;
const unpadRandomMax16 = (e) => {
    const t = new Uint8Array(e);
    if (0 === t.length) {
        throw new Error('unpadPkcs7 given empty bytes');
    }
    var r = t[t.length - 1];
    if (r > t.length) {
        throw new Error(`unpad given ${t.length} bytes, but pad is ${r}`);
    }
    return new Uint8Array(t.buffer, t.byteOffset, t.length - r);
};
exports.unpadRandomMax16 = unpadRandomMax16;
const encodeWAMessage = (message) => (Buffer.from(exports.writeRandomPadMax16(new WABinary_1.Binary(WAProto_1.proto.Message.encode(message).finish())).readByteArray()));
exports.encodeWAMessage = encodeWAMessage;
const generateRegistrationId = () => (Uint16Array.from(crypto_1.randomBytes(2))[0] & 0x3fff);
exports.generateRegistrationId = generateRegistrationId;
const encodeInt = (e, t) => {
    for (var r = t, a = new Uint8Array(e), i = e - 1; i >= 0; i--) {
        a[i] = 255 & r;
        r >>>= 8;
    }
    return a;
};
exports.encodeInt = encodeInt;
const encodeBigEndian = (e, t = 4) => {
    let r = e;
    const a = new Uint8Array(t);
    for (let i = t - 1; i >= 0; i--) {
        a[i] = 255 & r;
        r >>>= 8;
    }
    return a;
};
exports.encodeBigEndian = encodeBigEndian;
const toNumber = (t) => ((typeof t === 'object' && t) ? ('toNumber' in t ? t.toNumber() : t.low) : t);
exports.toNumber = toNumber;
function shallowChanges(old, current, { lookForDeletedKeys }) {
    const changes = {};
    for (const key in current) {
        if (old[key] !== current[key]) {
            changes[key] = current[key] || null;
        }
    }
    if (lookForDeletedKeys) {
        for (const key in old) {
            if (!changes[key] && old[key] !== current[key]) {
                changes[key] = current[key] || null;
            }
        }
    }
    return changes;
}
exports.shallowChanges = shallowChanges;
/** unix timestamp of a date in seconds */
const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000);
exports.unixTimestampSeconds = unixTimestampSeconds;
const debouncedTimeout = (intervalMs = 1000, task = undefined) => {
    let timeout;
    return {
        start: (newIntervalMs, newTask) => {
            task = newTask || task;
            intervalMs = newIntervalMs || intervalMs;
            timeout && clearTimeout(timeout);
            timeout = setTimeout(task, intervalMs);
        },
        cancel: () => {
            timeout && clearTimeout(timeout);
            timeout = undefined;
        },
        setTask: (newTask) => task = newTask,
        setInterval: (newInterval) => intervalMs = newInterval
    };
};
exports.debouncedTimeout = debouncedTimeout;
const delay = (ms) => exports.delayCancellable(ms).delay;
exports.delay = delay;
const delayCancellable = (ms) => {
    const stack = new Error().stack;
    let timeout;
    let reject;
    const delay = new Promise((resolve, _reject) => {
        timeout = setTimeout(resolve, ms);
        reject = _reject;
    });
    const cancel = () => {
        clearTimeout(timeout);
        reject(new boom_1.Boom('Cancelled', {
            statusCode: 500,
            data: {
                stack
            }
        }));
    };
    return { delay, cancel };
};
exports.delayCancellable = delayCancellable;
async function promiseTimeout(ms, promise) {
    if (!ms) {
        return new Promise(promise);
    }
    const stack = new Error().stack;
    // Create a promise that rejects in <ms> milliseconds
    const { delay, cancel } = exports.delayCancellable(ms);
    const p = new Promise((resolve, reject) => {
        delay
            .then(() => reject(new boom_1.Boom('Timed Out', {
            statusCode: Types_1.DisconnectReason.timedOut,
            data: {
                stack
            }
        })))
            .catch(err => reject(err));
        promise(resolve, reject);
    })
        .finally(cancel);
    return p;
}
exports.promiseTimeout = promiseTimeout;
// generate a random ID to attach to a message
const generateMessageID = () => 'BAE5' + crypto_1.randomBytes(6).toString('hex').toUpperCase();
exports.generateMessageID = generateMessageID;
const bindWaitForConnectionUpdate = (ev) => (async (check, timeoutMs) => {
    let listener;
    await (promiseTimeout(timeoutMs, (resolve, reject) => {
        listener = (update) => {
            var _a;
            if (check(update)) {
                resolve();
            }
            else if (update.connection === 'close') {
                reject(((_a = update.lastDisconnect) === null || _a === void 0 ? void 0 : _a.error) || new boom_1.Boom('Connection Closed', { statusCode: Types_1.DisconnectReason.connectionClosed }));
            }
        };
        ev.on('connection.update', listener);
    })
        .finally(() => (ev.off('connection.update', listener))));
});
exports.bindWaitForConnectionUpdate = bindWaitForConnectionUpdate;
const printQRIfNecessaryListener = (ev, logger) => {
    ev.on('connection.update', async ({ qr }) => {
        if (qr) {
            const QR = await Promise.resolve().then(() => __importStar(require('qrcode-terminal'))).catch(err => {
                logger.error('QR code terminal not added as dependency');
            });
            QR === null || QR === void 0 ? void 0 : QR.generate(qr, { small: true });
        }
    });
};
exports.printQRIfNecessaryListener = printQRIfNecessaryListener;
/**
 * utility that fetches latest baileys version from the master branch.
 * Use to ensure your WA connection is always on the latest version
 */
const fetchLatestBaileysVersion = async () => {
    const URL = 'https://raw.githubusercontent.com/adiwajshing/Baileys/master/src/Defaults/baileys-version.json';
    try {
        const result = await axios_1.default.get(URL, { responseType: 'json' });
        return {
            version: result.data.version,
            isLatest: true
        };
    }
    catch (error) {
        return {
            version: baileys_version_json_1.version,
            isLatest: false,
            error
        };
    }
};
exports.fetchLatestBaileysVersion = fetchLatestBaileysVersion;
const STATUS_MAP = {
    'played': WAProto_1.proto.WebMessageInfo.WebMessageInfoStatus.PLAYED,
    'read': WAProto_1.proto.WebMessageInfo.WebMessageInfoStatus.READ,
    'read-self': WAProto_1.proto.WebMessageInfo.WebMessageInfoStatus.READ
};
const getStatusFromReceiptType = (type) => {
    const status = STATUS_MAP[type];
    if (typeof type === 'undefined') {
        return WAProto_1.proto.WebMessageInfo.WebMessageInfoStatus.DELIVERY_ACK;
    }
    return status;
};
exports.getStatusFromReceiptType = getStatusFromReceiptType;
