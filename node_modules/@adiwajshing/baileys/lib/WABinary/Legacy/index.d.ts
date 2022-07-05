/// <reference types="node" />
import { BinaryNode } from '../types';
export declare const isLegacyBinaryNode: (buffer: Buffer) => boolean;
declare function decode(buffer: Buffer, indexRef: {
    index: number;
}): BinaryNode;
export declare const encodeBinaryNodeLegacy: ({ tag, attrs, content }: BinaryNode, buffer?: number[]) => Buffer;
export declare const decodeBinaryNodeLegacy: typeof decode;
export {};
