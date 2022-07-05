/// <reference types="ws" />
/// <reference types="node" />
import { SocketConfig } from '../Types';
declare const makeWASocket: (config: Partial<SocketConfig>) => {
    getOrderDetails: (orderId: string, tokenBase64: string) => Promise<import("../Types").OrderDetails>;
    getCatalog: (jid?: string, limit?: number) => Promise<{
        products: import("../Types").Product[];
    }>;
    getCollections: (jid?: string, limit?: number) => Promise<{
        collections: import("../Types").CatalogCollection[];
    }>;
    productCreate: (create: import("../Types").ProductCreate) => Promise<import("../Types").Product>;
    productDelete: (productIds: string[]) => Promise<{
        deleted: number;
    }>;
    productUpdate: (productId: string, update: import("../Types").ProductUpdate) => Promise<import("../Types").Product>;
    processMessage: (msg: import("../Types").WAProto.IWebMessageInfo) => Promise<Partial<import("../Types").BaileysEventMap<any>>>;
    sendMessageAck: ({ tag, attrs }: import("..").BinaryNode, extraAttrs: {
        [key: string]: string;
    }) => Promise<void>;
    sendRetryRequest: (node: import("..").BinaryNode) => Promise<void>;
    appPatch: (patchCreate: import("../Types").WAPatchCreate) => Promise<void>;
    sendPresenceUpdate: (type: import("../Types").WAPresence, toJid?: string) => Promise<void>;
    presenceSubscribe: (toJid: string) => Promise<void>;
    profilePictureUrl: (jid: string, type?: "image" | "preview", timeoutMs?: number) => Promise<string>;
    onWhatsApp: (...jids: string[]) => Promise<{
        exists: boolean;
        jid: string;
    }[]>;
    fetchBlocklist: () => Promise<string[]>;
    fetchStatus: (jid: string) => Promise<{
        status: string;
        setAt: Date;
    }>;
    updateProfilePicture: (jid: string, content: import("../Types").WAMediaUpload) => Promise<void>;
    updateBlockStatus: (jid: string, action: "block" | "unblock") => Promise<void>;
    getBusinessProfile: (jid: string) => Promise<void | import("../Types").WABusinessProfile>;
    resyncAppState: (collections: import("../Types").WAPatchName[]) => Promise<import("../Types").AppStateChunk>;
    chatModify: (mod: import("../Types").ChatModification, jid: string) => Promise<void>;
    resyncMainAppState: () => Promise<void>;
    assertSessions: (jids: string[], force: boolean) => Promise<boolean>;
    relayMessage: (jid: string, message: import("../Types").WAProto.IMessage, { messageId: msgId, participant, additionalAttributes, cachedGroupMetadata }: import("../Types").MessageRelayOptions) => Promise<string>;
    sendReceipt: (jid: string, participant: string, messageIds: string[], type: import("../Types").MessageReceiptType) => Promise<void>;
    sendReadReceipt: (jid: string, participant: string, messageIds: string[]) => Promise<void>;
    readMessages: (keys: import("../Types").WAProto.IMessageKey[]) => Promise<void>;
    refreshMediaConn: (forceGet?: boolean) => Promise<import("../Types").MediaConnInfo>;
    waUploadToServer: import("../Types").WAMediaUploadFunction;
    fetchPrivacySettings: (force?: boolean) => Promise<{
        [_: string]: string;
    }>;
    sendMessage: (jid: string, content: import("../Types").AnyMessageContent, options?: import("../Types").MiscMessageGenerationOptions) => Promise<import("../Types").WAProto.WebMessageInfo>;
    groupMetadata: (jid: string) => Promise<import("../Types").GroupMetadata>;
    groupCreate: (subject: string, participants: string[]) => Promise<import("../Types").GroupMetadata>;
    groupLeave: (id: string) => Promise<void>;
    groupUpdateSubject: (jid: string, subject: string) => Promise<void>;
    groupParticipantsUpdate: (jid: string, participants: string[], action: import("../Types").ParticipantAction) => Promise<string[]>;
    groupUpdateDescription: (jid: string, description?: string) => Promise<void>;
    groupInviteCode: (jid: string) => Promise<string>;
    groupRevokeInvite: (jid: string) => Promise<string>;
    groupAcceptInvite: (code: string) => Promise<string>;
    groupAcceptInviteV4: (jid: string, inviteMessage: import("../Types").WAProto.IGroupInviteMessage) => Promise<string>;
    groupToggleEphemeral: (jid: string, ephemeralExpiration: number) => Promise<void>;
    groupSettingUpdate: (jid: string, setting: "announcement" | "locked" | "not_announcement" | "unlocked") => Promise<void>;
    groupFetchAllParticipating: () => Promise<{
        [_: string]: import("../Types").GroupMetadata;
    }>;
    type: "md";
    ws: import("ws");
    ev: import("../Types").BaileysEventEmitter;
    authState: {
        creds: import("../Types").AuthenticationCreds;
        keys: import("../Types").SignalKeyStoreWithTransaction;
    };
    user: import("../Types").Contact;
    emitEventsFromMap: (map: Partial<import("../Types").BaileysEventMap<import("../Types").AuthenticationCreds>>) => void;
    assertingPreKeys: (range: number, execute: (keys: {
        [_: number]: any;
    }) => Promise<void>) => Promise<void>;
    generateMessageTag: () => string;
    query: (node: import("..").BinaryNode, timeoutMs?: number) => Promise<import("..").BinaryNode>;
    waitForMessage: (msgId: string, timeoutMs?: number) => Promise<any>;
    waitForSocketOpen: () => Promise<void>;
    sendRawMessage: (data: Uint8Array | Buffer) => Promise<void>;
    sendNode: (node: import("..").BinaryNode) => Promise<void>;
    logout: () => Promise<void>;
    end: (error: Error) => void;
    onUnexpectedError: (error: Error, msg: string) => void;
    uploadPreKeys: (count?: number) => Promise<void>;
    waitForConnectionUpdate: (check: (u: Partial<import("../Types").ConnectionState>) => boolean, timeoutMs?: number) => Promise<void>;
};
export default makeWASocket;
