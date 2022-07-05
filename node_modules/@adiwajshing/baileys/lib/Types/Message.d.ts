/// <reference types="node" />
import type NodeCache from 'node-cache';
import type { Logger } from 'pino';
import type { Readable } from 'stream';
import type { URL } from 'url';
import { proto } from '../../WAProto';
import type { GroupMetadata } from './GroupMetadata';
export { proto as WAProto };
export declare type WAMessage = proto.IWebMessageInfo;
export declare type WAMessageContent = proto.IMessage;
export declare type WAContactMessage = proto.IContactMessage;
export declare type WAContactsArrayMessage = proto.IContactsArrayMessage;
export declare type WAMessageKey = proto.IMessageKey;
export declare type WATextMessage = proto.IExtendedTextMessage;
export declare type WAContextInfo = proto.IContextInfo;
export declare type WALocationMessage = proto.ILocationMessage;
export declare type WAGenericMediaMessage = proto.IVideoMessage | proto.IImageMessage | proto.IAudioMessage | proto.IDocumentMessage | proto.IStickerMessage;
export import WAMessageStubType = proto.WebMessageInfo.WebMessageInfoStubType;
export import WAMessageStatus = proto.WebMessageInfo.WebMessageInfoStatus;
export declare type WAMediaUpload = Buffer | {
    url: URL | string;
} | {
    stream: Readable;
};
/** Set of message types that are supported by the library */
export declare type MessageType = keyof proto.Message;
export declare type DownloadableMessage = {
    mediaKey?: Uint8Array;
    directPath?: string;
    url?: string;
};
export declare type MessageReceiptType = 'read' | 'read-self' | 'hist_sync' | 'peer_msg' | 'sender' | undefined;
export declare type MediaConnInfo = {
    auth: string;
    ttl: number;
    hosts: {
        hostname: string;
        maxContentLengthBytes: number;
    }[];
    fetchDate: Date;
};
export interface WAUrlInfo {
    'canonical-url': string;
    'matched-text': string;
    title: string;
    description: string;
    jpegThumbnail?: Buffer;
}
declare type Mentionable = {
    /** list of jids that are mentioned in the accompanying text */
    mentions?: string[];
};
declare type ViewOnce = {
    viewOnce?: boolean;
};
declare type Buttonable = {
    /** add buttons to the message  */
    buttons?: proto.IButton[];
};
declare type Templatable = {
    /** add buttons to the message (conflicts with normal buttons)*/
    templateButtons?: proto.IHydratedTemplateButton[];
    footer?: string;
};
declare type Listable = {
    /** Sections of the List */
    sections?: proto.ISection[];
    /** Title of a List Message only */
    title?: string;
    /** Text of the bnutton on the list (required) */
    buttonText?: string;
};
declare type WithDimensions = {
    width?: number;
    height?: number;
};
export declare type MediaType = 'image' | 'video' | 'sticker' | 'audio' | 'document' | 'history' | 'md-app-state';
export declare type AnyMediaMessageContent = (({
    image: WAMediaUpload;
    caption?: string;
    jpegThumbnail?: string;
} & Mentionable & Buttonable & Templatable & WithDimensions) | ({
    video: WAMediaUpload;
    caption?: string;
    gifPlayback?: boolean;
    jpegThumbnail?: string;
} & Mentionable & Buttonable & Templatable & WithDimensions) | {
    audio: WAMediaUpload;
    /** if set to true, will send as a `voice note` */
    ptt?: boolean;
    /** optionally tell the duration of the audio */
    seconds?: number;
} | ({
    sticker: WAMediaUpload;
} & WithDimensions) | ({
    document: WAMediaUpload;
    mimetype: string;
    fileName?: string;
} & Buttonable & Templatable)) & {
    mimetype?: string;
};
export declare type AnyRegularMessageContent = (({
    text: string;
} & Mentionable & Buttonable & Templatable & Listable) | AnyMediaMessageContent | {
    contacts: {
        displayName?: string;
        contacts: proto.IContactMessage[];
    };
} | {
    location: WALocationMessage;
} | {
    react: proto.IReactionMessage;
}) & ViewOnce;
export declare type AnyMessageContent = AnyRegularMessageContent | {
    forward: WAMessage;
    force?: boolean;
} | {
    delete: WAMessageKey;
} | {
    disappearingMessagesInChat: boolean | number;
};
export declare type MessageRelayOptions = {
    messageId?: string;
    /** only send to a specific participant */
    participant?: string;
    additionalAttributes?: {
        [_: string]: string;
    };
    cachedGroupMetadata?: (jid: string) => Promise<GroupMetadata | undefined>;
};
export declare type MiscMessageGenerationOptions = {
    /** Force message id */
    messageId?: string;
    /** optional, if you want to manually set the timestamp of the message */
    timestamp?: Date;
    /** the message you want to quote */
    quoted?: WAMessage;
    /** disappearing messages settings */
    ephemeralExpiration?: number | string;
    mediaUploadTimeoutMs?: number;
};
export declare type MessageGenerationOptionsFromContent = MiscMessageGenerationOptions & {
    userJid: string;
};
export declare type WAMediaUploadFunction = (readStream: Readable, opts: {
    fileEncSha256B64: string;
    mediaType: MediaType;
    timeoutMs?: number;
}) => Promise<{
    mediaUrl: string;
    directPath: string;
}>;
export declare type MediaGenerationOptions = {
    logger?: Logger;
    upload: WAMediaUploadFunction;
    /** cache media so it does not have to be uploaded again */
    mediaCache?: NodeCache;
    mediaUploadTimeoutMs?: number;
};
export declare type MessageContentGenerationOptions = MediaGenerationOptions & {
    getUrlInfo?: (text: string) => Promise<WAUrlInfo>;
};
export declare type MessageGenerationOptions = MessageContentGenerationOptions & MessageGenerationOptionsFromContent;
export declare type MessageUpdateType = 'append' | 'notify' | 'replace';
export declare type MessageUserReceipt = proto.IUserReceipt;
export declare type WAMessageUpdate = {
    update: Partial<WAMessage>;
    key: proto.IMessageKey;
};
export declare type WAMessageCursor = {
    before: WAMessageKey | undefined;
} | {
    after: WAMessageKey | undefined;
};
export declare type MessageUserReceiptUpdate = {
    key: proto.IMessageKey;
    receipt: MessageUserReceipt;
};
