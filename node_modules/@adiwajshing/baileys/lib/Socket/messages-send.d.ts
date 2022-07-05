/// <reference types="ws" />
/// <reference types="node" />
import { proto } from '../../WAProto';
import { AnyMessageContent, MediaConnInfo, MessageReceiptType, MessageRelayOptions, MiscMessageGenerationOptions, SocketConfig, WAMessageKey } from '../Types';
import { BinaryNode } from '../WABinary';
export declare const makeMessagesSocket: (config: SocketConfig) => {
    assertSessions: (jids: string[], force: boolean) => Promise<boolean>;
    relayMessage: (jid: string, message: proto.IMessage, { messageId: msgId, participant, additionalAttributes, cachedGroupMetadata }: MessageRelayOptions) => Promise<string>;
    sendReceipt: (jid: string, participant: string | undefined, messageIds: string[], type: MessageReceiptType) => Promise<void>;
    sendReadReceipt: (jid: string, participant: string | undefined, messageIds: string[]) => Promise<void>;
    readMessages: (keys: WAMessageKey[]) => Promise<void>;
    refreshMediaConn: (forceGet?: boolean) => Promise<MediaConnInfo>;
    waUploadToServer: import("../Types").WAMediaUploadFunction;
    fetchPrivacySettings: (force?: boolean) => Promise<{
        [_: string]: string;
    }>;
    sendMessage: (jid: string, content: AnyMessageContent, options?: MiscMessageGenerationOptions) => Promise<proto.WebMessageInfo>;
    groupMetadata: (jid: string) => Promise<import("../Types").GroupMetadata>;
    groupCreate: (subject: string, participants: string[]) => Promise<import("../Types").GroupMetadata>;
    groupLeave: (id: string) => Promise<void>;
    groupUpdateSubject: (jid: string, subject: string) => Promise<void>;
    groupParticipantsUpdate: (jid: string, participants: string[], action: import("../Types").ParticipantAction) => Promise<string[]>;
    groupUpdateDescription: (jid: string, description?: string) => Promise<void>;
    groupInviteCode: (jid: string) => Promise<string>;
    groupRevokeInvite: (jid: string) => Promise<string>;
    groupAcceptInvite: (code: string) => Promise<string>;
    groupAcceptInviteV4: (jid: string, inviteMessage: proto.IGroupInviteMessage) => Promise<string>;
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
    query: (node: BinaryNode, timeoutMs?: number) => Promise<BinaryNode>;
    waitForMessage: (msgId: string, timeoutMs?: number) => Promise<any>;
    waitForSocketOpen: () => Promise<void>;
    sendRawMessage: (data: Uint8Array | Buffer) => Promise<void>;
    sendNode: (node: BinaryNode) => Promise<void>;
    logout: () => Promise<void>;
    end: (error: Error) => void;
    onUnexpectedError: (error: Error, msg: string) => void;
    uploadPreKeys: (count?: number) => Promise<void>;
    waitForConnectionUpdate: (check: (u: Partial<import("../Types").ConnectionState>) => boolean, timeoutMs?: number) => Promise<void>;
};
