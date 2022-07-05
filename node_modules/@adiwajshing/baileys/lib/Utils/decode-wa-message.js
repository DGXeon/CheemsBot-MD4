"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeMessageStanza = void 0;
const boom_1 = require("@hapi/boom");
const WAProto_1 = require("../../WAProto");
const WABinary_1 = require("../WABinary");
const generics_1 = require("./generics");
const signal_1 = require("./signal");
const NO_MESSAGE_FOUND_ERROR_TEXT = 'No message found';
const decodeMessageStanza = (stanza, auth) => {
    let msgType;
    let chatId;
    let author;
    const msgId = stanza.attrs.id;
    const from = stanza.attrs.from;
    const participant = stanza.attrs.participant;
    const recipient = stanza.attrs.recipient;
    const isMe = (jid) => WABinary_1.areJidsSameUser(jid, auth.creds.me.id);
    if (WABinary_1.isJidUser(from)) {
        if (recipient) {
            if (!isMe(from)) {
                throw new boom_1.Boom('');
            }
            chatId = recipient;
        }
        else {
            chatId = from;
        }
        msgType = 'chat';
        author = from;
    }
    else if (WABinary_1.isJidGroup(from)) {
        if (!participant) {
            throw new boom_1.Boom('No participant in group message');
        }
        msgType = 'group';
        author = participant;
        chatId = from;
    }
    else if (WABinary_1.isJidBroadcast(from)) {
        if (!participant) {
            throw new boom_1.Boom('No participant in group message');
        }
        const isParticipantMe = isMe(participant);
        if (WABinary_1.isJidStatusBroadcast(from)) {
            msgType = isParticipantMe ? 'direct_peer_status' : 'other_status';
        }
        else {
            msgType = isParticipantMe ? 'peer_broadcast' : 'other_broadcast';
        }
        chatId = from;
        author = participant;
    }
    const sender = msgType === 'chat' ? author : chatId;
    const fromMe = isMe(stanza.attrs.participant || stanza.attrs.from);
    const pushname = stanza.attrs.notify;
    const key = {
        remoteJid: chatId,
        fromMe,
        id: msgId,
        participant
    };
    const fullMessage = {
        key,
        messageTimestamp: +stanza.attrs.t,
        pushName: pushname
    };
    if (key.fromMe) {
        fullMessage.status = WAProto_1.proto.WebMessageInfo.WebMessageInfoStatus.SERVER_ACK;
    }
    return {
        fullMessage,
        category: stanza.attrs.category,
        author,
        decryptionTask: (async () => {
            var _a;
            let decryptables = 0;
            if (Array.isArray(stanza.content)) {
                for (const { tag, attrs, content } of stanza.content) {
                    if (tag !== 'enc') {
                        continue;
                    }
                    if (!(content instanceof Uint8Array)) {
                        continue;
                    }
                    decryptables += 1;
                    let msgBuffer;
                    try {
                        const e2eType = attrs.type;
                        switch (e2eType) {
                            case 'skmsg':
                                msgBuffer = await signal_1.decryptGroupSignalProto(sender, author, content, auth);
                                break;
                            case 'pkmsg':
                            case 'msg':
                                const user = WABinary_1.isJidUser(sender) ? sender : author;
                                msgBuffer = await signal_1.decryptSignalProto(user, e2eType, content, auth);
                                break;
                        }
                        let msg = WAProto_1.proto.Message.decode(generics_1.unpadRandomMax16(msgBuffer));
                        msg = ((_a = msg.deviceSentMessage) === null || _a === void 0 ? void 0 : _a.message) || msg;
                        if (msg.senderKeyDistributionMessage) {
                            await signal_1.processSenderKeyMessage(author, msg.senderKeyDistributionMessage, auth);
                        }
                        if (fullMessage.message) {
                            Object.assign(fullMessage.message, msg);
                        }
                        else {
                            fullMessage.message = msg;
                        }
                    }
                    catch (error) {
                        fullMessage.messageStubType = WAProto_1.proto.WebMessageInfo.WebMessageInfoStubType.CIPHERTEXT;
                        fullMessage.messageStubParameters = [error.message];
                    }
                }
            }
            // if nothing was found to decrypt
            if (!decryptables) {
                fullMessage.messageStubType = WAProto_1.proto.WebMessageInfo.WebMessageInfoStubType.CIPHERTEXT;
                fullMessage.messageStubParameters = [NO_MESSAGE_FOUND_ERROR_TEXT];
            }
        })()
    };
};
exports.decodeMessageStanza = decodeMessageStanza;
