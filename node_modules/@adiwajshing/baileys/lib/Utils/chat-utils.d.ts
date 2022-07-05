/// <reference types="node" />
import type { Logger } from 'pino';
import { proto } from '../../WAProto';
import { AuthenticationCreds, BaileysEventMap, ChatModification, ChatMutation, Contact, LTHashState, WAPatchCreate, WAPatchName } from '../Types';
import { BinaryNode } from '../WABinary';
declare type FetchAppStateSyncKey = (keyId: string) => Promise<proto.IAppStateSyncKeyData> | proto.IAppStateSyncKeyData;
export declare const newLTHashState: () => LTHashState;
export declare const encodeSyncdPatch: ({ type, index, syncAction, apiVersion, operation }: WAPatchCreate, myAppStateKeyId: string, state: LTHashState, getAppStateSyncKey: FetchAppStateSyncKey) => Promise<{
    patch: proto.ISyncdPatch;
    state: LTHashState;
}>;
export declare const decodeSyncdMutations: (msgMutations: (proto.ISyncdMutation | proto.ISyncdRecord)[], initialState: LTHashState, getAppStateSyncKey: FetchAppStateSyncKey, validateMacs: boolean) => Promise<{
    hash: Buffer;
    indexValueMap: {
        [indexMacBase64: string]: {
            valueMac: Uint8Array | Buffer;
        };
    };
    mutations: ChatMutation[];
}>;
export declare const decodeSyncdPatch: (msg: proto.ISyncdPatch, name: WAPatchName, initialState: LTHashState, getAppStateSyncKey: FetchAppStateSyncKey, validateMacs: boolean) => Promise<{
    hash: Buffer;
    indexValueMap: {
        [indexMacBase64: string]: {
            valueMac: Uint8Array | Buffer;
        };
    };
    mutations: ChatMutation[];
}>;
export declare const extractSyncdPatches: (result: BinaryNode) => Promise<{
    critical_block: {
        patches: proto.ISyncdPatch[];
        hasMorePatches: boolean;
        snapshot?: proto.ISyncdSnapshot;
    };
    critical_unblock_low: {
        patches: proto.ISyncdPatch[];
        hasMorePatches: boolean;
        snapshot?: proto.ISyncdSnapshot;
    };
    regular_low: {
        patches: proto.ISyncdPatch[];
        hasMorePatches: boolean;
        snapshot?: proto.ISyncdSnapshot;
    };
    regular_high: {
        patches: proto.ISyncdPatch[];
        hasMorePatches: boolean;
        snapshot?: proto.ISyncdSnapshot;
    };
    regular: {
        patches: proto.ISyncdPatch[];
        hasMorePatches: boolean;
        snapshot?: proto.ISyncdSnapshot;
    };
}>;
export declare const downloadExternalBlob: (blob: proto.IExternalBlobReference) => Promise<Buffer>;
export declare const downloadExternalPatch: (blob: proto.IExternalBlobReference) => Promise<proto.SyncdMutations>;
export declare const decodeSyncdSnapshot: (name: WAPatchName, snapshot: proto.ISyncdSnapshot, getAppStateSyncKey: FetchAppStateSyncKey, minimumVersionNumber: number | undefined, validateMacs?: boolean) => Promise<{
    state: LTHashState;
    mutations: ChatMutation[];
}>;
export declare const decodePatches: (name: WAPatchName, syncds: proto.ISyncdPatch[], initial: LTHashState, getAppStateSyncKey: FetchAppStateSyncKey, minimumVersionNumber?: number, validateMacs?: boolean) => Promise<{
    newMutations: ChatMutation[];
    state: LTHashState;
}>;
export declare const chatModificationToAppPatch: (mod: ChatModification, jid: string) => WAPatchCreate;
export declare const processSyncActions: (actions: ChatMutation[], me: Contact, logger?: Logger) => Partial<BaileysEventMap<AuthenticationCreds>>;
export {};
