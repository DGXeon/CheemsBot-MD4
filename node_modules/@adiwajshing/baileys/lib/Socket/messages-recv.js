"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeMessagesRecvSocket = void 0;
const WAProto_1 = require("../../WAProto");
const Defaults_1 = require("../Defaults");
const Types_1 = require("../Types");
const Utils_1 = require("../Utils");
const make_mutex_1 = require("../Utils/make-mutex");
const process_message_1 = __importDefault(require("../Utils/process-message"));
const WABinary_1 = require("../WABinary");
const chats_1 = require("./chats");
const groups_1 = require("./groups");
const MIN_PREKEY_COUNT = 5;
const makeMessagesRecvSocket = (config) => {
    const { logger, treatCiphertextMessagesAsReal, retryRequestDelayMs } = config;
    const sock = chats_1.makeChatsSocket(config);
    const { ev, authState, ws, onUnexpectedError, assertSessions, assertingPreKeys, sendNode, relayMessage, sendReceipt, resyncMainAppState, emitEventsFromMap, uploadPreKeys, } = sock;
    /** this mutex ensures that the notifications (receipts, messages etc.) are processed in order */
    const processingMutex = make_mutex_1.makeKeyedMutex();
    /** this mutex ensures that each retryRequest will wait for the previous one to finish */
    const retryMutex = make_mutex_1.makeMutex();
    const appStateSyncTimeout = Utils_1.debouncedTimeout(6000, () => ws.readyState === ws.OPEN && resyncMainAppState());
    const msgRetryMap = config.msgRetryCounterMap || {};
    const historyCache = new Set();
    const sendMessageAck = async ({ tag, attrs }, extraAttrs) => {
        const stanza = {
            tag: 'ack',
            attrs: {
                id: attrs.id,
                to: attrs.from,
                ...extraAttrs,
            }
        };
        if (!!attrs.participant) {
            stanza.attrs.participant = attrs.participant;
        }
        logger.debug({ recv: attrs, sent: stanza.attrs }, `sent "${tag}" ack`);
        await sendNode(stanza);
    };
    const sendRetryRequest = async (node) => {
        const msgId = node.attrs.id;
        const retryCount = msgRetryMap[msgId] || 1;
        if (retryCount >= 5) {
            logger.debug({ retryCount, msgId }, 'reached retry limit, clearing');
            delete msgRetryMap[msgId];
            return;
        }
        msgRetryMap[msgId] = retryCount + 1;
        const isGroup = !!node.attrs.participant;
        const { account, signedPreKey, signedIdentityKey: identityKey } = authState.creds;
        const deviceIdentity = WAProto_1.proto.ADVSignedDeviceIdentity.encode(account).finish();
        await assertingPreKeys(1, async (preKeys) => {
            const [keyId] = Object.keys(preKeys);
            const key = preKeys[+keyId];
            const decFrom = node.attrs.from ? WABinary_1.jidDecode(node.attrs.from) : undefined;
            const receipt = {
                tag: 'receipt',
                attrs: {
                    id: msgId,
                    type: 'retry',
                    to: isGroup ? node.attrs.from : WABinary_1.jidEncode(decFrom.user, 's.whatsapp.net', decFrom.device, 0)
                },
                content: [
                    {
                        tag: 'retry',
                        attrs: {
                            count: retryCount.toString(),
                            id: node.attrs.id,
                            t: node.attrs.t,
                            v: '1'
                        }
                    },
                    {
                        tag: 'registration',
                        attrs: {},
                        content: Utils_1.encodeBigEndian(authState.creds.registrationId)
                    }
                ]
            };
            if (node.attrs.recipient) {
                receipt.attrs.recipient = node.attrs.recipient;
            }
            if (node.attrs.participant) {
                receipt.attrs.participant = node.attrs.participant;
            }
            if (retryCount > 1) {
                const exec = Utils_1.generateSignalPubKey(Buffer.from(Defaults_1.KEY_BUNDLE_TYPE)).slice(0, 1);
                const content = receipt.content;
                content.push({
                    tag: 'keys',
                    attrs: {},
                    content: [
                        { tag: 'type', attrs: {}, content: exec },
                        { tag: 'identity', attrs: {}, content: identityKey.public },
                        Utils_1.xmppPreKey(key, +keyId),
                        Utils_1.xmppSignedPreKey(signedPreKey),
                        { tag: 'device-identity', attrs: {}, content: deviceIdentity }
                    ]
                });
            }
            await sendNode(receipt);
            logger.info({ msgAttrs: node.attrs, retryCount }, 'sent retry receipt');
        });
    };
    const processMessageLocal = async (msg) => {
        var _a;
        const meId = authState.creds.me.id;
        // process message and emit events
        const newEvents = await process_message_1.default(msg, { historyCache, meId, keyStore: authState.keys, logger, treatCiphertextMessagesAsReal });
        // send ack for history message
        const normalizedContent = !!msg.message ? Utils_1.normalizeMessageContent(msg.message) : undefined;
        const isAnyHistoryMsg = !!((_a = normalizedContent === null || normalizedContent === void 0 ? void 0 : normalizedContent.protocolMessage) === null || _a === void 0 ? void 0 : _a.historySyncNotification);
        if (isAnyHistoryMsg) {
            const jid = WABinary_1.jidEncode(WABinary_1.jidDecode(msg.key.remoteJid).user, 'c.us');
            await sendReceipt(jid, undefined, [msg.key.id], 'hist_sync');
            // we only want to sync app state once we've all the history
            // restart the app state sync timeout
            logger.debug('restarting app sync timeout');
            appStateSyncTimeout.start();
        }
        return newEvents;
    };
    const handleEncryptNotification = async (node) => {
        const from = node.attrs.from;
        if (from === WABinary_1.S_WHATSAPP_NET) {
            const countChild = WABinary_1.getBinaryNodeChild(node, 'count');
            const count = +countChild.attrs.value;
            const shouldUploadMorePreKeys = count < MIN_PREKEY_COUNT;
            logger.debug({ count, shouldUploadMorePreKeys }, 'recv pre-key count');
            if (shouldUploadMorePreKeys) {
                await uploadPreKeys();
            }
        }
        else {
            const identityNode = WABinary_1.getBinaryNodeChild(node, 'identity');
            if (identityNode) {
                logger.info({ jid: from }, 'identity changed');
                // not handling right now
                // signal will override new identity anyway
            }
            else {
                logger.info({ node }, 'unknown encrypt notification');
            }
        }
    };
    const processNotification = async (node) => {
        const result = {};
        const [child] = WABinary_1.getAllBinaryNodeChildren(node);
        if (node.attrs.type === 'w:gp2') {
            switch (child === null || child === void 0 ? void 0 : child.tag) {
                case 'create':
                    const metadata = groups_1.extractGroupMetadata(child);
                    result.messageStubType = Types_1.WAMessageStubType.GROUP_CREATE;
                    result.messageStubParameters = [metadata.subject];
                    result.key = { participant: metadata.owner };
                    ev.emit('chats.upsert', [{
                            id: metadata.id,
                            name: metadata.subject,
                            conversationTimestamp: metadata.creation,
                        }]);
                    ev.emit('groups.upsert', [metadata]);
                    break;
                case 'ephemeral':
                case 'not_ephemeral':
                    result.message = {
                        protocolMessage: {
                            type: WAProto_1.proto.ProtocolMessage.ProtocolMessageType.EPHEMERAL_SETTING,
                            ephemeralExpiration: +(child.attrs.expiration || 0)
                        }
                    };
                    break;
                case 'promote':
                case 'demote':
                case 'remove':
                case 'add':
                case 'leave':
                    const stubType = `GROUP_PARTICIPANT_${child.tag.toUpperCase()}`;
                    result.messageStubType = Types_1.WAMessageStubType[stubType];
                    const participants = WABinary_1.getBinaryNodeChildren(child, 'participant').map(p => p.attrs.jid);
                    if (participants.length === 1 &&
                        // if recv. "remove" message and sender removed themselves
                        // mark as left
                        WABinary_1.areJidsSameUser(participants[0], node.attrs.participant) &&
                        child.tag === 'remove') {
                        result.messageStubType = Types_1.WAMessageStubType.GROUP_PARTICIPANT_LEAVE;
                    }
                    result.messageStubParameters = participants;
                    break;
                case 'subject':
                    result.messageStubType = Types_1.WAMessageStubType.GROUP_CHANGE_SUBJECT;
                    result.messageStubParameters = [child.attrs.subject];
                    break;
                case 'announcement':
                case 'not_announcement':
                    result.messageStubType = Types_1.WAMessageStubType.GROUP_CHANGE_ANNOUNCE;
                    result.messageStubParameters = [(child.tag === 'announcement') ? 'on' : 'off'];
                    break;
                case 'locked':
                case 'unlocked':
                    result.messageStubType = Types_1.WAMessageStubType.GROUP_CHANGE_RESTRICT;
                    result.messageStubParameters = [(child.tag === 'locked') ? 'on' : 'off'];
                    break;
            }
        }
        else {
            switch (child.tag) {
                case 'devices':
                    const devices = WABinary_1.getBinaryNodeChildren(child, 'device');
                    if (WABinary_1.areJidsSameUser(child.attrs.jid, authState.creds.me.id)) {
                        const deviceJids = devices.map(d => d.attrs.jid);
                        logger.info({ deviceJids }, 'got my own devices');
                    }
                    break;
                case 'encrypt':
                    handleEncryptNotification(node);
                    break;
            }
        }
        if (Object.keys(result).length) {
            return result;
        }
    };
    const sendMessagesAgain = async (key, ids) => {
        const msgs = await Promise.all(ids.map(id => (config.getMessage({ ...key, id }))));
        const participant = key.participant || key.remoteJid;
        await assertSessions([participant], true);
        if (WABinary_1.isJidGroup(key.remoteJid)) {
            await authState.keys.set({ 'sender-key-memory': { [key.remoteJid]: null } });
        }
        logger.debug({ participant }, 'forced new session for retry recp');
        for (let i = 0; i < msgs.length; i++) {
            if (msgs[i]) {
                await relayMessage(key.remoteJid, msgs[i], {
                    messageId: ids[i],
                    participant
                });
            }
            else {
                logger.debug({ jid: key.remoteJid, id: ids[i] }, 'recv retry request, but message not available');
            }
        }
    };
    const handleReceipt = async (node) => {
        var _a;
        let shouldAck = true;
        const { attrs, content } = node;
        const isNodeFromMe = WABinary_1.areJidsSameUser(attrs.participant || attrs.from, (_a = authState.creds.me) === null || _a === void 0 ? void 0 : _a.id);
        const remoteJid = !isNodeFromMe || WABinary_1.isJidGroup(attrs.from) ? attrs.from : attrs.recipient;
        const fromMe = !attrs.recipient || (attrs.type === 'retry' && isNodeFromMe);
        const ids = [attrs.id];
        if (Array.isArray(content)) {
            const items = WABinary_1.getBinaryNodeChildren(content[0], 'item');
            ids.push(...items.map(i => i.attrs.id));
        }
        const key = {
            remoteJid,
            id: '',
            fromMe,
            participant: attrs.participant
        };
        await processingMutex.mutex(remoteJid, async () => {
            const status = Utils_1.getStatusFromReceiptType(attrs.type);
            if (typeof status !== 'undefined' &&
                (
                // basically, we only want to know when a message from us has been delivered to/read by the other person
                // or another device of ours has read some messages
                status > WAProto_1.proto.WebMessageInfo.WebMessageInfoStatus.DELIVERY_ACK ||
                    !isNodeFromMe)) {
                if (WABinary_1.isJidGroup(remoteJid)) {
                    const updateKey = status === WAProto_1.proto.WebMessageInfo.WebMessageInfoStatus.DELIVERY_ACK ? 'receiptTimestamp' : 'readTimestamp';
                    ev.emit('message-receipt.update', ids.map(id => ({
                        key: { ...key, id },
                        receipt: {
                            userJid: WABinary_1.jidNormalizedUser(attrs.participant),
                            [updateKey]: +attrs.t
                        }
                    })));
                }
                else {
                    ev.emit('messages.update', ids.map(id => ({
                        key: { ...key, id },
                        update: { status }
                    })));
                }
            }
            if (attrs.type === 'retry') {
                // correctly set who is asking for the retry
                key.participant = key.participant || attrs.from;
                if (key.fromMe) {
                    try {
                        logger.debug({ attrs, key }, 'recv retry request');
                        await sendMessagesAgain(key, ids);
                    }
                    catch (error) {
                        logger.error({ key, ids, trace: error.stack }, 'error in sending message again');
                        shouldAck = false;
                    }
                }
                else {
                    logger.info({ attrs, key }, 'recv retry for not fromMe message');
                }
            }
            if (shouldAck) {
                await sendMessageAck(node, { class: 'receipt', type: attrs.type });
            }
        });
    };
    const handleNotification = async (node) => {
        const remoteJid = node.attrs.from;
        await sendMessageAck(node, { class: 'notification', type: node.attrs.type });
        await processingMutex.mutex(remoteJid, async () => {
            const msg = await processNotification(node);
            if (msg) {
                const fromMe = WABinary_1.areJidsSameUser(node.attrs.participant || node.attrs.from, authState.creds.me.id);
                msg.key = {
                    remoteJid: node.attrs.from,
                    fromMe,
                    participant: node.attrs.participant,
                    id: node.attrs.id,
                    ...(msg.key || {})
                };
                msg.participant = node.attrs.participant;
                msg.messageTimestamp = +node.attrs.t;
                const fullMsg = WAProto_1.proto.WebMessageInfo.fromObject(msg);
                ev.emit('messages.upsert', { messages: [fullMsg], type: 'append' });
            }
        });
    };
    const handleUpsertedMessages = async ({ messages, type }) => {
        var _a;
        if (type === 'notify' || type === 'append') {
            const contactNameUpdates = {};
            for (const msg of messages) {
                const normalizedChatId = WABinary_1.jidNormalizedUser(msg.key.remoteJid);
                if (!!msg.pushName) {
                    let jid = msg.key.fromMe ? authState.creds.me.id : (msg.key.participant || msg.key.remoteJid);
                    jid = WABinary_1.jidNormalizedUser(jid);
                    contactNameUpdates[jid] = msg.pushName;
                    // update our pushname too
                    if (msg.key.fromMe && ((_a = authState.creds.me) === null || _a === void 0 ? void 0 : _a.name) !== msg.pushName) {
                        ev.emit('creds.update', { me: { ...authState.creds.me, name: msg.pushName } });
                    }
                }
                const events = await processingMutex.mutex('p-' + normalizedChatId, () => processMessageLocal(msg));
                emitEventsFromMap(events);
            }
            if (Object.keys(contactNameUpdates).length) {
                ev.emit('contacts.update', Object.keys(contactNameUpdates).map(id => ({ id, notify: contactNameUpdates[id] })));
            }
        }
    };
    // recv a message
    ws.on('CB:message', (stanza) => {
        const { fullMessage: msg, category, author, decryptionTask } = Utils_1.decodeMessageStanza(stanza, authState);
        processingMutex.mutex(msg.key.remoteJid, async () => {
            await decryptionTask;
            // message failed to decrypt
            if (msg.messageStubType === WAProto_1.proto.WebMessageInfo.WebMessageInfoStubType.CIPHERTEXT) {
                logger.error({ msgId: msg.key.id, params: msg.messageStubParameters }, 'failure in decrypting message');
                retryMutex.mutex(async () => {
                    if (ws.readyState === ws.OPEN) {
                        await sendRetryRequest(stanza);
                        if (retryRequestDelayMs) {
                            await Utils_1.delay(retryRequestDelayMs);
                        }
                    }
                    else {
                        logger.debug({ stanza }, 'connection closed, ignoring retry req');
                    }
                });
            }
            else {
                await sendMessageAck(stanza, { class: 'receipt' });
                // no type in the receipt => message delivered
                let type = undefined;
                let participant = msg.key.participant;
                if (category === 'peer') { // special peer message
                    type = 'peer_msg';
                }
                else if (msg.key.fromMe) { // message was sent by us from a different device
                    type = 'sender';
                    // need to specially handle this case
                    if (WABinary_1.isJidUser(msg.key.remoteJid)) {
                        participant = author;
                    }
                }
                await sendReceipt(msg.key.remoteJid, participant, [msg.key.id], type);
            }
            msg.key.remoteJid = WABinary_1.jidNormalizedUser(msg.key.remoteJid);
            ev.emit('messages.upsert', { messages: [msg], type: stanza.attrs.offline ? 'append' : 'notify' });
        })
            .catch(error => onUnexpectedError(error, 'processing message'));
    });
    ws.on('CB:ack,class:message', async (node) => {
        sendNode({
            tag: 'ack',
            attrs: {
                class: 'receipt',
                id: node.attrs.id,
                from: node.attrs.from
            }
        })
            .catch(err => onUnexpectedError(err, 'ack message receipt'));
        logger.debug({ attrs: node.attrs }, 'sending receipt for ack');
    });
    ws.on('CB:call', async (node) => {
        logger.info({ node }, 'recv call');
        const [child] = WABinary_1.getAllBinaryNodeChildren(node);
        if (!!(child === null || child === void 0 ? void 0 : child.tag)) {
            sendMessageAck(node, { class: 'call', type: child.tag })
                .catch(error => onUnexpectedError(error, 'ack call'));
        }
    });
    ws.on('CB:receipt', node => {
        handleReceipt(node)
            .catch(error => onUnexpectedError(error, 'handling receipt'));
    });
    ws.on('CB:notification', async (node) => {
        handleNotification(node)
            .catch(error => {
            onUnexpectedError(error, 'handling notification');
        });
    });
    ev.on('messages.upsert', data => {
        handleUpsertedMessages(data)
            .catch(error => onUnexpectedError(error, 'handling upserted messages'));
    });
    return {
        ...sock,
        processMessage: processMessageLocal,
        sendMessageAck,
        sendRetryRequest
    };
};
exports.makeMessagesRecvSocket = makeMessagesRecvSocket;
