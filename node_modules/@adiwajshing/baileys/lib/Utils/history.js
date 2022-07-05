"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadAndProcessHistorySyncNotification = exports.processHistoryMessage = exports.downloadHistory = void 0;
const util_1 = require("util");
const zlib_1 = require("zlib");
const WAProto_1 = require("../../WAProto");
const messages_media_1 = require("./messages-media");
const inflatePromise = util_1.promisify(zlib_1.inflate);
const downloadHistory = async (msg) => {
    const stream = await messages_media_1.downloadContentFromMessage(msg, 'history');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    // decompress buffer
    buffer = await inflatePromise(buffer);
    const syncData = WAProto_1.proto.HistorySync.decode(buffer);
    return syncData;
};
exports.downloadHistory = downloadHistory;
const processHistoryMessage = (item, historyCache) => {
    const isLatest = historyCache.size === 0;
    const messages = [];
    const contacts = [];
    const chats = [];
    switch (item.syncType) {
        case WAProto_1.proto.HistorySync.HistorySyncHistorySyncType.INITIAL_BOOTSTRAP:
        case WAProto_1.proto.HistorySync.HistorySyncHistorySyncType.RECENT:
            for (const chat of item.conversations) {
                const contactId = `c:${chat.id}`;
                if (chat.name && !historyCache.has(contactId)) {
                    contacts.push({ id: chat.id, name: chat.name });
                    historyCache.add(contactId);
                }
                for (const { message } of chat.messages || []) {
                    const uqId = `${message.key.remoteJid}:${message.key.id}`;
                    if (!historyCache.has(uqId)) {
                        messages.push(message);
                        historyCache.add(uqId);
                    }
                }
                delete chat.messages;
                if (!historyCache.has(chat.id)) {
                    chats.push(chat);
                    historyCache.add(chat.id);
                }
            }
            break;
        case WAProto_1.proto.HistorySync.HistorySyncHistorySyncType.PUSH_NAME:
            for (const c of item.pushnames) {
                const contactId = `c:${c.id}`;
                if (!historyCache.has(contactId)) {
                    contacts.push({ notify: c.pushname, id: c.id });
                    historyCache.add(contactId);
                }
            }
            break;
        case WAProto_1.proto.HistorySync.HistorySyncHistorySyncType.INITIAL_STATUS_V3:
            // TODO
            break;
    }
    return {
        chats,
        contacts,
        messages,
        isLatest,
    };
};
exports.processHistoryMessage = processHistoryMessage;
const downloadAndProcessHistorySyncNotification = async (msg, historyCache) => {
    const historyMsg = await exports.downloadHistory(msg);
    return exports.processHistoryMessage(historyMsg, historyCache);
};
exports.downloadAndProcessHistorySyncNotification = downloadAndProcessHistorySyncNotification;
