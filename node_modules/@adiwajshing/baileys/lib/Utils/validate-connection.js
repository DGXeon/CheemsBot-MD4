"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureSuccessfulPairing = exports.generateRegistrationNode = exports.generateLoginNode = void 0;
const boom_1 = require("@hapi/boom");
const crypto_1 = require("crypto");
const WAProto_1 = require("../../WAProto");
const WABinary_1 = require("../WABinary");
const crypto_2 = require("./crypto");
const generics_1 = require("./generics");
const signal_1 = require("./signal");
const getUserAgent = ({ version }) => ({
    appVersion: {
        primary: version[0],
        secondary: version[1],
        tertiary: version[2],
    },
    platform: WAProto_1.proto.UserAgent.UserAgentPlatform.WEB,
    releaseChannel: WAProto_1.proto.UserAgent.UserAgentReleaseChannel.RELEASE,
    mcc: '000',
    mnc: '000',
    osVersion: '0.1',
    manufacturer: '',
    device: 'Desktop',
    osBuildNumber: '0.1',
    localeLanguageIso6391: 'en',
    localeCountryIso31661Alpha2: 'US',
});
const getWebInfo = () => ({
    webSubPlatform: WAProto_1.proto.WebInfo.WebInfoWebSubPlatform.WEB_BROWSER
});
const getClientPayload = (config) => {
    return {
        passive: true,
        connectType: WAProto_1.proto.ClientPayload.ClientPayloadConnectType.WIFI_UNKNOWN,
        connectReason: WAProto_1.proto.ClientPayload.ClientPayloadConnectReason.USER_ACTIVATED,
        userAgent: getUserAgent(config),
        webInfo: getWebInfo(),
    };
};
const generateLoginNode = (userJid, config) => {
    const { user, device } = WABinary_1.jidDecode(userJid);
    const payload = {
        ...getClientPayload(config),
        username: +user,
        device: device,
    };
    return WAProto_1.proto.ClientPayload.fromObject(payload);
};
exports.generateLoginNode = generateLoginNode;
const generateRegistrationNode = ({ registrationId, signedPreKey, signedIdentityKey }, config) => {
    // the app version needs to be md5 hashed
    // and passed in
    const appVersionBuf = crypto_1.createHash('md5')
        .update(config.version.join('.')) // join as string
        .digest();
    const browserVersion = config.browser[2].split('.');
    const companion = {
        os: config.browser[0],
        version: {
            primary: +(browserVersion[0] || 10),
            secondary: +(browserVersion[1] || 0),
            tertiary: +(browserVersion[2] || 0),
        },
        platformType: WAProto_1.proto.CompanionProps.CompanionPropsPlatformType.CHROME,
        requireFullSync: false,
    };
    const companionProto = WAProto_1.proto.CompanionProps.encode(companion).finish();
    const registerPayload = {
        ...getClientPayload(config),
        regData: {
            buildHash: appVersionBuf,
            companionProps: companionProto,
            eRegid: generics_1.encodeInt(4, registrationId),
            eKeytype: generics_1.encodeInt(1, 5),
            eIdent: signedIdentityKey.public,
            eSkeyId: generics_1.encodeInt(3, signedPreKey.keyId),
            eSkeyVal: signedPreKey.keyPair.public,
            eSkeySig: signedPreKey.signature,
        },
    };
    return WAProto_1.proto.ClientPayload.fromObject(registerPayload);
};
exports.generateRegistrationNode = generateRegistrationNode;
const configureSuccessfulPairing = (stanza, { advSecretKey, signedIdentityKey, signalIdentities }) => {
    var _a, _b, _c, _d, _e;
    const [pair] = WABinary_1.getAllBinaryNodeChildren(stanza);
    const pairContent = Array.isArray(pair.content) ? pair.content : [];
    const msgId = stanza.attrs.id;
    const deviceIdentity = (_a = pairContent.find(m => m.tag === 'device-identity')) === null || _a === void 0 ? void 0 : _a.content;
    const businessName = (_c = (_b = pairContent.find(m => m.tag === 'biz')) === null || _b === void 0 ? void 0 : _b.attrs) === null || _c === void 0 ? void 0 : _c.name;
    const verifiedName = businessName || '';
    const jid = (_e = (_d = pairContent.find(m => m.tag === 'device')) === null || _d === void 0 ? void 0 : _d.attrs) === null || _e === void 0 ? void 0 : _e.jid;
    const { details, hmac } = WAProto_1.proto.ADVSignedDeviceIdentityHMAC.decode(deviceIdentity);
    const advSign = crypto_2.hmacSign(details, Buffer.from(advSecretKey, 'base64'));
    if (Buffer.compare(hmac, advSign) !== 0) {
        throw new boom_1.Boom('Invalid pairing');
    }
    const account = WAProto_1.proto.ADVSignedDeviceIdentity.decode(details);
    const { accountSignatureKey, accountSignature } = account;
    const accountMsg = WABinary_1.Binary.build(new Uint8Array([6, 0]), account.details, signedIdentityKey.public).readByteArray();
    if (!crypto_2.Curve.verify(accountSignatureKey, accountMsg, accountSignature)) {
        throw new boom_1.Boom('Failed to verify account signature');
    }
    const deviceMsg = WABinary_1.Binary.build(new Uint8Array([6, 1]), account.details, signedIdentityKey.public, account.accountSignatureKey).readByteArray();
    account.deviceSignature = crypto_2.Curve.sign(signedIdentityKey.private, deviceMsg);
    const identity = signal_1.createSignalIdentity(jid, accountSignatureKey);
    const keyIndex = WAProto_1.proto.ADVDeviceIdentity.decode(account.details).keyIndex;
    const accountEnc = WAProto_1.proto.ADVSignedDeviceIdentity.encode({
        ...account.toJSON(),
        accountSignatureKey: undefined
    }).finish();
    const reply = {
        tag: 'iq',
        attrs: {
            to: WABinary_1.S_WHATSAPP_NET,
            type: 'result',
            id: msgId,
        },
        content: [
            {
                tag: 'pair-device-sign',
                attrs: {},
                content: [
                    {
                        tag: 'device-identity',
                        attrs: { 'key-index': `${keyIndex}` },
                        content: accountEnc
                    }
                ]
            }
        ]
    };
    const authUpdate = {
        account,
        me: { id: jid, verifiedName },
        signalIdentities: [...(signalIdentities || []), identity]
    };
    return {
        creds: authUpdate,
        reply
    };
};
exports.configureSuccessfulPairing = configureSuccessfulPairing;
