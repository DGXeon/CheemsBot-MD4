"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadMediaMessage = exports.aggregateMessageKeysNotFromMe = exports.updateMessageWithReceipt = exports.getDevice = exports.extractMessageContent = exports.normalizeMessageContent = exports.getContentType = exports.generateWAMessage = exports.generateWAMessageFromContent = exports.generateWAMessageContent = exports.generateForwardMessageContent = exports.prepareDisappearingMessageSettingContent = exports.prepareWAMessageMedia = void 0;
const boom_1 = require("@hapi/boom");
const fs_1 = require("fs");
const WAProto_1 = require("../../WAProto");
const Defaults_1 = require("../Defaults");
const Types_1 = require("../Types");
const generics_1 = require("./generics");
const messages_media_1 = require("./messages-media");
const MIMETYPE_MAP = {
    image: 'image/jpeg',
    video: 'video/mp4',
    document: 'application/pdf',
    audio: 'audio/ogg; codecs=opus',
    sticker: 'image/webp',
    history: 'application/x-protobuf',
    'md-app-state': 'application/x-protobuf',
};
const MessageTypeProto = {
    'image': Types_1.WAProto.ImageMessage,
    'video': Types_1.WAProto.VideoMessage,
    'audio': Types_1.WAProto.AudioMessage,
    'sticker': Types_1.WAProto.StickerMessage,
    'document': Types_1.WAProto.DocumentMessage,
};
const ButtonType = WAProto_1.proto.ButtonsMessage.ButtonsMessageHeaderType;
const prepareWAMessageMedia = async (message, options) => {
    const logger = options.logger;
    let mediaType;
    for (const key of Defaults_1.MEDIA_KEYS) {
        if (key in message) {
            mediaType = key;
        }
    }
    const uploadData = {
        ...message,
        media: message[mediaType]
    };
    delete uploadData[mediaType];
    // check if cacheable + generate cache key
    const cacheableKey = typeof uploadData.media === 'object' &&
        ('url' in uploadData.media) &&
        !!uploadData.media.url &&
        !!options.mediaCache && (
    // generate the key
    mediaType + ':' + uploadData.media.url.toString());
    if (mediaType === 'document' && !uploadData.fileName) {
        uploadData.fileName = 'file';
    }
    if (!uploadData.mimetype) {
        uploadData.mimetype = MIMETYPE_MAP[mediaType];
    }
    // check for cache hit
    if (cacheableKey) {
        const mediaBuff = options.mediaCache.get(cacheableKey);
        if (mediaBuff) {
            logger === null || logger === void 0 ? void 0 : logger.debug({ cacheableKey }, 'got media cache hit');
            const obj = Types_1.WAProto.Message.decode(mediaBuff);
            const key = `${mediaType}Message`;
            delete uploadData.media;
            Object.assign(obj[key], { ...uploadData });
            return obj;
        }
    }
    const requiresDurationComputation = mediaType === 'audio' && typeof uploadData.seconds === 'undefined';
    const requiresThumbnailComputation = (mediaType === 'image' || mediaType === 'video') &&
        (typeof uploadData['jpegThumbnail'] === 'undefined');
    const requiresOriginalForSomeProcessing = requiresDurationComputation || requiresThumbnailComputation;
    const { mediaKey, encWriteStream, bodyPath, fileEncSha256, fileSha256, fileLength, didSaveToTmpPath } = await messages_media_1.encryptedStream(uploadData.media, mediaType, requiresOriginalForSomeProcessing);
    // url safe Base64 encode the SHA256 hash of the body
    const fileEncSha256B64 = encodeURIComponent(fileEncSha256.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/\=+$/, ''));
    const [{ mediaUrl, directPath }] = await Promise.all([
        (async () => {
            const result = await options.upload(encWriteStream, { fileEncSha256B64, mediaType, timeoutMs: options.mediaUploadTimeoutMs });
            logger === null || logger === void 0 ? void 0 : logger.debug('uploaded media');
            return result;
        })(),
        (async () => {
            try {
                if (requiresThumbnailComputation) {
                    uploadData.jpegThumbnail = await messages_media_1.generateThumbnail(bodyPath, mediaType, options);
                    logger === null || logger === void 0 ? void 0 : logger.debug('generated thumbnail');
                }
                if (requiresDurationComputation) {
                    uploadData.seconds = await messages_media_1.getAudioDuration(bodyPath);
                    logger === null || logger === void 0 ? void 0 : logger.debug('computed audio duration');
                }
            }
            catch (error) {
                logger === null || logger === void 0 ? void 0 : logger.warn({ trace: error.stack }, 'failed to obtain extra info');
            }
        })(),
    ])
        .finally(async () => {
        encWriteStream.destroy();
        // remove tmp files
        if (didSaveToTmpPath && bodyPath) {
            await fs_1.promises.unlink(bodyPath);
            logger === null || logger === void 0 ? void 0 : logger.debug('removed tmp files');
        }
    });
    delete uploadData.media;
    const obj = Types_1.WAProto.Message.fromObject({
        [`${mediaType}Message`]: MessageTypeProto[mediaType].fromObject({
            url: mediaUrl,
            directPath,
            mediaKey,
            fileEncSha256,
            fileSha256,
            fileLength,
            mediaKeyTimestamp: generics_1.unixTimestampSeconds(),
            ...uploadData
        })
    });
    if (cacheableKey) {
        logger.debug({ cacheableKey }, 'set cache');
        options.mediaCache.set(cacheableKey, Types_1.WAProto.Message.encode(obj).finish());
    }
    return obj;
};
exports.prepareWAMessageMedia = prepareWAMessageMedia;
const prepareDisappearingMessageSettingContent = (ephemeralExpiration) => {
    ephemeralExpiration = ephemeralExpiration || 0;
    const content = {
        ephemeralMessage: {
            message: {
                protocolMessage: {
                    type: Types_1.WAProto.ProtocolMessage.ProtocolMessageType.EPHEMERAL_SETTING,
                    ephemeralExpiration
                }
            }
        }
    };
    return Types_1.WAProto.Message.fromObject(content);
};
exports.prepareDisappearingMessageSettingContent = prepareDisappearingMessageSettingContent;
/**
 * Generate forwarded message content like WA does
 * @param message the message to forward
 * @param options.forceForward will show the message as forwarded even if it is from you
 */
const generateForwardMessageContent = (message, forceForward) => {
    var _a;
    let content = message.message;
    if (!content) {
        throw new boom_1.Boom('no content in message', { statusCode: 400 });
    }
    // hacky copy
    content = exports.normalizeMessageContent(message.message);
    content = WAProto_1.proto.Message.decode(WAProto_1.proto.Message.encode(content).finish());
    let key = Object.keys(content)[0];
    let score = ((_a = content[key].contextInfo) === null || _a === void 0 ? void 0 : _a.forwardingScore) || 0;
    score += message.key.fromMe && !forceForward ? 0 : 1;
    if (key === 'conversation') {
        content.extendedTextMessage = { text: content[key] };
        delete content.conversation;
        key = 'extendedTextMessage';
    }
    if (score > 0) {
        content[key].contextInfo = { forwardingScore: score, isForwarded: true };
    }
    else {
        content[key].contextInfo = {};
    }
    return content;
};
exports.generateForwardMessageContent = generateForwardMessageContent;
const generateWAMessageContent = async (message, options) => {
    var _a, _b;
    let m = {};
    if ('text' in message) {
        const extContent = { ...message };
        if (!!options.getUrlInfo && message.text.match(Defaults_1.URL_REGEX)) {
            try {
                const data = await options.getUrlInfo(message.text);
                extContent.canonicalUrl = data['canonical-url'];
                extContent.matchedText = data['matched-text'];
                extContent.jpegThumbnail = data.jpegThumbnail;
                extContent.description = data.description;
                extContent.title = data.title;
                extContent.previewType = 0;
            }
            catch (error) { // ignore if fails
                (_a = options.logger) === null || _a === void 0 ? void 0 : _a.warn({ trace: error.stack }, 'url generation failed');
            }
        }
        m.extendedTextMessage = extContent;
    }
    else if ('contacts' in message) {
        const contactLen = message.contacts.contacts.length;
        if (!contactLen) {
            throw new boom_1.Boom('require atleast 1 contact', { statusCode: 400 });
        }
        if (contactLen === 1) {
            m.contactMessage = Types_1.WAProto.ContactMessage.fromObject(message.contacts.contacts[0]);
        }
        else {
            m.contactsArrayMessage = Types_1.WAProto.ContactsArrayMessage.fromObject(message.contacts);
        }
    }
    else if ('location' in message) {
        m.locationMessage = Types_1.WAProto.LocationMessage.fromObject(message.location);
    }
    else if ('react' in message) {
        m.reactionMessage = Types_1.WAProto.ReactionMessage.fromObject(message.react);
    }
    else if ('delete' in message) {
        m.protocolMessage = {
            key: message.delete,
            type: Types_1.WAProto.ProtocolMessage.ProtocolMessageType.REVOKE
        };
    }
    else if ('forward' in message) {
        m = exports.generateForwardMessageContent(message.forward, message.force);
    }
    else if ('disappearingMessagesInChat' in message) {
        const exp = typeof message.disappearingMessagesInChat === 'boolean' ?
            (message.disappearingMessagesInChat ? Defaults_1.WA_DEFAULT_EPHEMERAL : 0) :
            message.disappearingMessagesInChat;
        m = exports.prepareDisappearingMessageSettingContent(exp);
    }
    else {
        m = await exports.prepareWAMessageMedia(message, options);
    }
    if ('buttons' in message && !!message.buttons) {
        const buttonsMessage = {
            buttons: message.buttons.map(b => ({ ...b, type: WAProto_1.proto.Button.ButtonType.RESPONSE }))
        };
        if ('text' in message) {
            buttonsMessage.contentText = message.text;
            buttonsMessage.headerType = ButtonType.EMPTY;
        }
        else {
            if ('caption' in message) {
                buttonsMessage.contentText = message.caption;
            }
            const type = Object.keys(m)[0].replace('Message', '').toUpperCase();
            buttonsMessage.headerType = ButtonType[type];
            Object.assign(buttonsMessage, m);
        }
        if ('footer' in message && !!message.footer) {
            buttonsMessage.footerText = message.footer;
        }
        m = { buttonsMessage };
    }
    else if ('templateButtons' in message && !!message.templateButtons) {
        const templateMessage = {
            hydratedTemplate: {
                hydratedButtons: message.templateButtons
            }
        };
        if ('text' in message) {
            templateMessage.hydratedTemplate.hydratedContentText = message.text;
        }
        else {
            if ('caption' in message) {
                templateMessage.hydratedTemplate.hydratedContentText = message.caption;
            }
            Object.assign(templateMessage.hydratedTemplate, m);
        }
        if ('footer' in message && !!message.footer) {
            templateMessage.hydratedTemplate.hydratedFooterText = message.footer;
        }
        m = { templateMessage };
    }
    if ('sections' in message && !!message.sections) {
        const listMessage = {
            sections: message.sections,
            buttonText: message.buttonText,
            title: message.title,
            footerText: message.footer,
            description: message.text,
            listType: WAProto_1.proto.ListMessage.ListMessageListType['SINGLE_SELECT']
        };
        m = { listMessage };
    }
    if ('viewOnce' in message && !!message.viewOnce) {
        m = { viewOnceMessage: { message: m } };
    }
    if ('mentions' in message && ((_b = message.mentions) === null || _b === void 0 ? void 0 : _b.length)) {
        const [messageType] = Object.keys(m);
        m[messageType].contextInfo = m[messageType] || {};
        m[messageType].contextInfo.mentionedJid = message.mentions;
    }
    return Types_1.WAProto.Message.fromObject(m);
};
exports.generateWAMessageContent = generateWAMessageContent;
const generateWAMessageFromContent = (jid, message, options) => {
    if (!options.timestamp) {
        options.timestamp = new Date();
    } // set timestamp to now
    const key = Object.keys(message)[0];
    const timestamp = generics_1.unixTimestampSeconds(options.timestamp);
    const { quoted, userJid } = options;
    if (quoted) {
        const participant = quoted.key.fromMe ? userJid : (quoted.participant || quoted.key.participant || quoted.key.remoteJid);
        message[key].contextInfo = message[key].contextInfo || {};
        message[key].contextInfo.participant = participant;
        message[key].contextInfo.stanzaId = quoted.key.id;
        message[key].contextInfo.quotedMessage = quoted.message;
        // if a participant is quoted, then it must be a group
        // hence, remoteJid of group must also be entered
        if (quoted.key.participant || quoted.participant) {
            message[key].contextInfo.remoteJid = quoted.key.remoteJid;
        }
    }
    if (
    // if we want to send a disappearing message
    !!(options === null || options === void 0 ? void 0 : options.ephemeralExpiration) &&
        // and it's not a protocol message -- delete, toggle disappear message
        key !== 'protocolMessage' &&
        // already not converted to disappearing message
        key !== 'ephemeralMessage') {
        message[key].contextInfo = {
            ...(message[key].contextInfo || {}),
            expiration: options.ephemeralExpiration || Defaults_1.WA_DEFAULT_EPHEMERAL,
            //ephemeralSettingTimestamp: options.ephemeralOptions.eph_setting_ts?.toString()
        };
        message = {
            ephemeralMessage: {
                message
            }
        };
    }
    message = Types_1.WAProto.Message.fromObject(message);
    const messageJSON = {
        key: {
            remoteJid: jid,
            fromMe: true,
            id: (options === null || options === void 0 ? void 0 : options.messageId) || generics_1.generateMessageID(),
        },
        message: message,
        messageTimestamp: timestamp,
        messageStubParameters: [],
        participant: jid.includes('@g.us') ? userJid : undefined,
        status: Types_1.WAMessageStatus.PENDING
    };
    return Types_1.WAProto.WebMessageInfo.fromObject(messageJSON);
};
exports.generateWAMessageFromContent = generateWAMessageFromContent;
const generateWAMessage = async (jid, content, options) => {
    var _a;
    // ensure msg ID is with every log
    options.logger = (_a = options === null || options === void 0 ? void 0 : options.logger) === null || _a === void 0 ? void 0 : _a.child({ msgId: options.messageId });
    return exports.generateWAMessageFromContent(jid, await exports.generateWAMessageContent(content, options), options);
};
exports.generateWAMessage = generateWAMessage;
/** Get the key to access the true type of content */
const getContentType = (content) => {
    if (content) {
        const keys = Object.keys(content);
        const key = keys.find(k => (k === 'conversation' || k.endsWith('Message')) && k !== 'senderKeyDistributionMessage');
        return key;
    }
};
exports.getContentType = getContentType;
/**
 * Normalizes ephemeral, view once messages to regular message content
 * Eg. image messages in ephemeral messages, in view once messages etc.
 * @param content
 * @returns
 */
const normalizeMessageContent = (content) => {
    var _a, _b, _c, _d, _e;
    content = ((_c = (_b = (_a = content === null || content === void 0 ? void 0 : content.ephemeralMessage) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.viewOnceMessage) === null || _c === void 0 ? void 0 : _c.message) ||
        ((_d = content === null || content === void 0 ? void 0 : content.ephemeralMessage) === null || _d === void 0 ? void 0 : _d.message) ||
        ((_e = content === null || content === void 0 ? void 0 : content.viewOnceMessage) === null || _e === void 0 ? void 0 : _e.message) ||
        content ||
        undefined;
    return content;
};
exports.normalizeMessageContent = normalizeMessageContent;
/**
 * Extract the true message content from a message
 * Eg. extracts the inner message from a disappearing message/view once message
 */
const extractMessageContent = (content) => {
    var _a, _b, _c, _d, _e, _f;
    const extractFromTemplateMessage = (msg) => {
        if (msg.imageMessage) {
            return { imageMessage: msg.imageMessage };
        }
        else if (msg.documentMessage) {
            return { documentMessage: msg.documentMessage };
        }
        else if (msg.videoMessage) {
            return { videoMessage: msg.videoMessage };
        }
        else if (msg.locationMessage) {
            return { locationMessage: msg.locationMessage };
        }
        else {
            return { conversation: 'contentText' in msg ? msg.contentText : ('hydratedContentText' in msg ? msg.hydratedContentText : '') };
        }
    };
    content = exports.normalizeMessageContent(content);
    if (content === null || content === void 0 ? void 0 : content.buttonsMessage) {
        return extractFromTemplateMessage(content.buttonsMessage);
    }
    if ((_a = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _a === void 0 ? void 0 : _a.hydratedFourRowTemplate) {
        return extractFromTemplateMessage((_b = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _b === void 0 ? void 0 : _b.hydratedFourRowTemplate);
    }
    if ((_c = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _c === void 0 ? void 0 : _c.hydratedTemplate) {
        return extractFromTemplateMessage((_d = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _d === void 0 ? void 0 : _d.hydratedTemplate);
    }
    if ((_e = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _e === void 0 ? void 0 : _e.fourRowTemplate) {
        return extractFromTemplateMessage((_f = content === null || content === void 0 ? void 0 : content.templateMessage) === null || _f === void 0 ? void 0 : _f.fourRowTemplate);
    }
    return content;
};
exports.extractMessageContent = extractMessageContent;
/**
 * Returns the device predicted by message ID
 */
const getDevice = (id) => {
    const deviceType = id.length > 21 ? 'android' : id.substring(0, 2) === '3A' ? 'ios' : 'web';
    return deviceType;
};
exports.getDevice = getDevice;
/** Upserts a receipt in the message */
const updateMessageWithReceipt = (msg, receipt) => {
    msg.userReceipt = msg.userReceipt || [];
    const recp = msg.userReceipt.find(m => m.userJid === receipt.userJid);
    if (recp) {
        Object.assign(recp, receipt);
    }
    else {
        msg.userReceipt.push(receipt);
    }
};
exports.updateMessageWithReceipt = updateMessageWithReceipt;
/** Given a list of message keys, aggregates them by chat & sender. Useful for sending read receipts in bulk */
const aggregateMessageKeysNotFromMe = (keys) => {
    const keyMap = {};
    for (const { remoteJid, id, participant, fromMe } of keys) {
        if (!fromMe) {
            const uqKey = `${remoteJid}:${participant || ''}`;
            if (!keyMap[uqKey]) {
                keyMap[uqKey] = {
                    jid: remoteJid,
                    participant,
                    messageIds: []
                };
            }
            keyMap[uqKey].messageIds.push(id);
        }
    }
    return Object.values(keyMap);
};
exports.aggregateMessageKeysNotFromMe = aggregateMessageKeysNotFromMe;
/**
 * Downloads the given message. Throws an error if it's not a media message
 */
const downloadMediaMessage = async (message, type, options) => {
    const mContent = exports.extractMessageContent(message.message);
    if (!mContent) {
        throw new boom_1.Boom('No message present', { statusCode: 400, data: message });
    }
    const contentType = exports.getContentType(mContent);
    const mediaType = contentType.replace('Message', '');
    const media = mContent[contentType];
    if (typeof media !== 'object' || !('url' in media)) {
        throw new boom_1.Boom(`"${contentType}" message is not a media message`);
    }
    const stream = await messages_media_1.downloadContentFromMessage(media, mediaType, options);
    if (type === 'buffer') {
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    }
    return stream;
};
exports.downloadMediaMessage = downloadMediaMessage;
