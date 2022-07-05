/// <reference types="node" />
import { AxiosRequestConfig } from 'axios';
import type { Logger } from 'pino';
import { Readable, Transform } from 'stream';
import { URL } from 'url';
import { CommonSocketConfig, DownloadableMessage, MediaConnInfo, MediaType, WAMediaUpload, WAMediaUploadFunction, WAMessageContent } from '../Types';
export declare const hkdfInfoKey: (type: MediaType) => string;
/** generates all the keys required to encrypt/decrypt & sign a media message */
export declare function getMediaKeys(buffer: any, mediaType: MediaType): {
    iv: Buffer;
    cipherKey: Buffer;
    macKey: Buffer;
};
export declare const extractImageThumb: (bufferOrFilePath: Readable | Buffer | string) => Promise<Buffer>;
export declare const generateProfilePicture: (mediaUpload: WAMediaUpload) => Promise<{
    img: Buffer;
}>;
/** gets the SHA256 of the given media message */
export declare const mediaMessageSHA256B64: (message: WAMessageContent) => string;
export declare function getAudioDuration(buffer: Buffer | string | Readable): Promise<number>;
export declare const toReadable: (buffer: Buffer) => Readable;
export declare const toBuffer: (stream: Readable) => Promise<Buffer>;
export declare const getStream: (item: WAMediaUpload) => Promise<{
    stream: Readable;
    type: string;
}>;
/** generates a thumbnail for a given media, if required */
export declare function generateThumbnail(file: string, mediaType: 'video' | 'image', options: {
    logger?: Logger;
}): Promise<string>;
export declare const getHttpStream: (url: string | URL, options?: AxiosRequestConfig & {
    isStream?: true;
}) => Promise<Readable>;
export declare const encryptedStream: (media: WAMediaUpload, mediaType: MediaType, saveOriginalFileIfRequired?: boolean, logger?: Logger) => Promise<{
    mediaKey: Buffer;
    encWriteStream: Readable;
    bodyPath: string;
    mac: Buffer;
    fileEncSha256: Buffer;
    fileSha256: Buffer;
    fileLength: number;
    didSaveToTmpPath: boolean;
}>;
export declare type MediaDownloadOptions = {
    startByte?: number;
    endByte?: number;
};
export declare const downloadContentFromMessage: ({ mediaKey, directPath, url }: DownloadableMessage, type: MediaType, { startByte, endByte }?: MediaDownloadOptions) => Promise<Transform>;
export declare function extensionForMediaMessage(message: WAMessageContent): string;
export declare const getWAUploadToServer: ({ customUploadHosts, fetchAgent, logger }: CommonSocketConfig<any>, refreshMediaConn: (force: boolean) => Promise<MediaConnInfo>) => WAMediaUploadFunction;
