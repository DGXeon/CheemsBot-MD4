"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WAProto_1 = require("../../WAProto");
const Types_1 = require("../Types");
const Utils_1 = require("../Utils");
const WABinary_1 = require("../WABinary");
const processMessage = async (message, { historyCache, meId, keyStore, logger, treatCiphertextMessagesAsReal }) => {
    var _a;
    const map = {};
    const chat = { id: WABinary_1.jidNormalizedUser(message.key.remoteJid) };
    const normalizedContent = !!message.message && Utils_1.normalizeMessageContent(message.message);
    if ((!!normalizedContent ||
        (message.messageStubType === Types_1.WAMessageStubType.CIPHERTEXT && treatCiphertextMessagesAsReal))
        && !(normalizedContent === null || normalizedContent === void 0 ? void 0 : normalizedContent.protocolMessage)
        && !(normalizedContent === null || normalizedContent === void 0 ? void 0 : normalizedContent.reactionMessage)) {
        chat.conversationTimestamp = Utils_1.toNumber(message.messageTimestamp);
        if (!message.key.fromMe) {
            chat.unreadCount = (chat.unreadCount || 0) + 1;
        }
    }
    const content = Utils_1.normalizeMessageContent(message.message);
    const protocolMsg = content === null || content === void 0 ? void 0 : content.protocolMessage;
    if (protocolMsg) {
        switch (protocolMsg.type) {
            case WAProto_1.proto.ProtocolMessage.ProtocolMessageType.HISTORY_SYNC_NOTIFICATION:
                const histNotification = protocolMsg.historySyncNotification;
                logger === null || logger === void 0 ? void 0 : logger.info({ histNotification, id: message.key.id }, 'got history notification');
                const { chats, contacts, messages, isLatest } = await Utils_1.downloadAndProcessHistorySyncNotification(histNotification, historyCache);
                if (chats.length) {
                    map['chats.set'] = { chats, isLatest };
                }
                if (messages.length) {
                    map['messages.set'] = { messages, isLatest };
                }
                if (contacts.length) {
                    map['contacts.set'] = { contacts };
                }
                break;
            case WAProto_1.proto.ProtocolMessage.ProtocolMessageType.APP_STATE_SYNC_KEY_SHARE:
                const keys = protocolMsg.appStateSyncKeyShare.keys;
                if (keys === null || keys === void 0 ? void 0 : keys.length) {
                    let newAppStateSyncKeyId = '';
                    await keyStore.transaction(async () => {
                        for (const { keyData, keyId } of keys) {
                            const strKeyId = Buffer.from(keyId.keyId).toString('base64');
                            logger === null || logger === void 0 ? void 0 : logger.info({ strKeyId }, 'injecting new app state sync key');
                            await keyStore.set({ 'app-state-sync-key': { [strKeyId]: keyData } });
                            newAppStateSyncKeyId = strKeyId;
                        }
                    });
                    map['creds.update'] = { myAppStateKeyId: newAppStateSyncKeyId };
                }
                else {
                    logger === null || logger === void 0 ? void 0 : logger.info({ protocolMsg }, 'recv app state sync with 0 keys');
                }
                break;
            case WAProto_1.proto.ProtocolMessage.ProtocolMessageType.REVOKE:
                map['messages.update'] = [
                    {
                        key: {
                            ...message.key,
                            id: protocolMsg.key.id
                        },
                        update: { message: null, messageStubType: Types_1.WAMessageStubType.REVOKE, key: message.key }
                    }
                ];
                break;
            case WAProto_1.proto.ProtocolMessage.ProtocolMessageType.EPHEMERAL_SETTING:
                Object.assign(chat, {
                    ephemeralSettingTimestamp: Utils_1.toNumber(message.messageTimestamp),
                    ephemeralExpiration: protocolMsg.ephemeralExpiration || null
                });
                break;
        }
    }
    else if (content === null || content === void 0 ? void 0 : content.reactionMessage) {
        const reaction = {
            ...content.reactionMessage,
            key: message.key,
        };
        const operation = ((_a = content.reactionMessage) === null || _a === void 0 ? void 0 : _a.text) ? 'add' : 'remove';
        map['messages.reaction'] = { reaction, key: content.reactionMessage.key, operation };
    }
    else if (message.messageStubType) {
        const jid = message.key.remoteJid;
        //let actor = whatsappID (message.participant)
        let participants;
        const emitParticipantsUpdate = (action) => (map['group-participants.update'] = { id: jid, participants, action });
        const emitGroupUpdate = (update) => {
            map['groups.update'] = [{ id: jid, ...update }];
        };
        const participantsIncludesMe = () => participants.find(jid => WABinary_1.areJidsSameUser(meId, jid));
        switch (message.messageStubType) {
            case Types_1.WAMessageStubType.GROUP_PARTICIPANT_LEAVE:
            case Types_1.WAMessageStubType.GROUP_PARTICIPANT_REMOVE:
                participants = message.messageStubParameters;
                emitParticipantsUpdate('remove');
                // mark the chat read only if you left the group
                if (participantsIncludesMe()) {
                    chat.readOnly = true;
                }
                break;
            case Types_1.WAMessageStubType.GROUP_PARTICIPANT_ADD:
            case Types_1.WAMessageStubType.GROUP_PARTICIPANT_INVITE:
            case Types_1.WAMessageStubType.GROUP_PARTICIPANT_ADD_REQUEST_JOIN:
                participants = message.messageStubParameters;
                if (participantsIncludesMe()) {
                    chat.readOnly = false;
                }
                emitParticipantsUpdate('add');
                break;
            case Types_1.WAMessageStubType.GROUP_CHANGE_ANNOUNCE:
                const announceValue = message.messageStubParameters[0];
                emitGroupUpdate({ announce: announceValue === 'true' || announceValue === 'on' });
                break;
            case Types_1.WAMessageStubType.GROUP_CHANGE_RESTRICT:
                const restrictValue = message.messageStubParameters[0];
                emitGroupUpdate({ restrict: restrictValue === 'true' || restrictValue === 'on' });
                break;
            case Types_1.WAMessageStubType.GROUP_CHANGE_SUBJECT:
                const name = message.messageStubParameters[0];
                chat.name = name;
                emitGroupUpdate({ subject: name });
                break;
        }
    }
    if (Object.keys(chat).length > 1) {
        map['chats.update'] = [chat];
    }
    return map;
};
exports.default = processMessage;
