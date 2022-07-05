/// <reference types="ws" />
/// <reference types="node" />
import { GroupMetadata, ParticipantAction, SocketConfig } from '../Types';
import { BinaryNode } from '../WABinary';
import { proto } from '../../WAProto';
export declare const makeGroupsSocket: (config: SocketConfig) => {
    groupMetadata: (jid: string) => Promise<GroupMetadata>;
    groupCreate: (subject: string, participants: string[]) => Promise<GroupMetadata>;
    groupLeave: (id: string) => Promise<void>;
    groupUpdateSubject: (jid: string, subject: string) => Promise<void>;
    groupParticipantsUpdate: (jid: string, participants: string[], action: ParticipantAction) => Promise<string[]>;
    groupUpdateDescription: (jid: string, description?: string) => Promise<void>;
    groupInviteCode: (jid: string) => Promise<string>;
    groupRevokeInvite: (jid: string) => Promise<string>;
    groupAcceptInvite: (code: string) => Promise<string>;
    groupAcceptInviteV4: (jid: string, inviteMessage: proto.IGroupInviteMessage) => Promise<string>;
    groupToggleEphemeral: (jid: string, ephemeralExpiration: number) => Promise<void>;
    groupSettingUpdate: (jid: string, setting: 'announcement' | 'not_announcement' | 'locked' | 'unlocked') => Promise<void>;
    groupFetchAllParticipating: () => Promise<{
        [_: string]: GroupMetadata;
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
export declare const extractGroupMetadata: (result: BinaryNode) => GroupMetadata;
