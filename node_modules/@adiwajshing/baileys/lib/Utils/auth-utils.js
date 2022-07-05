"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSingleFileAuthState = exports.initAuthCreds = exports.addTransactionCapability = void 0;
const boom_1 = require("@hapi/boom");
const crypto_1 = require("crypto");
const WAProto_1 = require("../../WAProto");
const crypto_2 = require("./crypto");
const generics_1 = require("./generics");
const KEY_MAP = {
    'pre-key': 'preKeys',
    'session': 'sessions',
    'sender-key': 'senderKeys',
    'app-state-sync-key': 'appStateSyncKeys',
    'app-state-sync-version': 'appStateVersions',
    'sender-key-memory': 'senderKeyMemory'
};
const addTransactionCapability = (state, logger) => {
    let inTransaction = false;
    let transactionCache = {};
    let mutations = {};
    const prefetch = async (type, ids) => {
        if (!inTransaction) {
            throw new boom_1.Boom('Cannot prefetch without transaction');
        }
        const dict = transactionCache[type];
        const idsRequiringFetch = dict ? ids.filter(item => !(item in dict)) : ids;
        // only fetch if there are any items to fetch
        if (idsRequiringFetch.length) {
            const result = await state.get(type, idsRequiringFetch);
            transactionCache[type] = transactionCache[type] || {};
            Object.assign(transactionCache[type], result);
        }
    };
    return {
        get: async (type, ids) => {
            if (inTransaction) {
                await prefetch(type, ids);
                return ids.reduce((dict, id) => {
                    var _a;
                    const value = (_a = transactionCache[type]) === null || _a === void 0 ? void 0 : _a[id];
                    if (value) {
                        dict[id] = value;
                    }
                    return dict;
                }, {});
            }
            else {
                return state.get(type, ids);
            }
        },
        set: data => {
            if (inTransaction) {
                logger.trace({ types: Object.keys(data) }, 'caching in transaction');
                for (const key in data) {
                    transactionCache[key] = transactionCache[key] || {};
                    Object.assign(transactionCache[key], data[key]);
                    mutations[key] = mutations[key] || {};
                    Object.assign(mutations[key], data[key]);
                }
            }
            else {
                return state.set(data);
            }
        },
        isInTransaction: () => inTransaction,
        prefetch: (type, ids) => {
            logger.trace({ type, ids }, 'prefetching');
            return prefetch(type, ids);
        },
        transaction: async (work) => {
            if (inTransaction) {
                await work();
            }
            else {
                logger.debug('entering transaction');
                inTransaction = true;
                try {
                    await work();
                    if (Object.keys(mutations).length) {
                        logger.debug('committing transaction');
                        await state.set(mutations);
                    }
                    else {
                        logger.debug('no mutations in transaction');
                    }
                }
                finally {
                    inTransaction = false;
                    transactionCache = {};
                    mutations = {};
                }
            }
        }
    };
};
exports.addTransactionCapability = addTransactionCapability;
const initAuthCreds = () => {
    const identityKey = crypto_2.Curve.generateKeyPair();
    return {
        noiseKey: crypto_2.Curve.generateKeyPair(),
        signedIdentityKey: identityKey,
        signedPreKey: crypto_2.signedKeyPair(identityKey, 1),
        registrationId: generics_1.generateRegistrationId(),
        advSecretKey: crypto_1.randomBytes(32).toString('base64'),
        nextPreKeyId: 1,
        firstUnuploadedPreKeyId: 1,
        serverHasPreKeys: false
    };
};
exports.initAuthCreds = initAuthCreds;
/** stores the full authentication state in a single JSON file */
const useSingleFileAuthState = (filename, logger) => {
    // require fs here so that in case "fs" is not available -- the app does not crash
    const { readFileSync, writeFileSync, existsSync } = require('fs');
    let creds;
    let keys = {};
    // save the authentication state to a file
    const saveState = () => {
        logger && logger.trace('saving auth state');
        writeFileSync(filename, 
        // BufferJSON replacer utility saves buffers nicely
        JSON.stringify({ creds, keys }, generics_1.BufferJSON.replacer, 2));
    };
    if (existsSync(filename)) {
        const result = JSON.parse(readFileSync(filename, { encoding: 'utf-8' }), generics_1.BufferJSON.reviver);
        creds = result.creds;
        keys = result.keys;
    }
    else {
        creds = exports.initAuthCreds();
        keys = {};
    }
    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const key = KEY_MAP[type];
                    return ids.reduce((dict, id) => {
                        var _a;
                        let value = (_a = keys[key]) === null || _a === void 0 ? void 0 : _a[id];
                        if (value) {
                            if (type === 'app-state-sync-key') {
                                value = WAProto_1.proto.AppStateSyncKeyData.fromObject(value);
                            }
                            dict[id] = value;
                        }
                        return dict;
                    }, {});
                },
                set: (data) => {
                    for (const _key in data) {
                        const key = KEY_MAP[_key];
                        keys[key] = keys[key] || {};
                        Object.assign(keys[key], data[_key]);
                    }
                    saveState();
                }
            }
        },
        saveState
    };
};
exports.useSingleFileAuthState = useSingleFileAuthState;
