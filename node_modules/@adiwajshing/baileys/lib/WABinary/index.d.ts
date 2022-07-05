/// <reference types="node" />
import { proto } from '../../WAProto';
import { BinaryNode } from './types';
export declare const decodeBinaryNode: (data: any) => BinaryNode;
export declare const encodeBinaryNode: (node: BinaryNode) => Uint8Array;
export declare const getBinaryNodeChildren: ({ content }: BinaryNode, childTag: string) => BinaryNode[];
export declare const getAllBinaryNodeChildren: ({ content }: BinaryNode) => BinaryNode[];
export declare const getBinaryNodeChild: ({ content }: BinaryNode, childTag: string) => BinaryNode;
export declare const getBinaryNodeChildBuffer: (node: BinaryNode, childTag: string) => Uint8Array | Buffer;
export declare const getBinaryNodeChildUInt: (node: BinaryNode, childTag: string, length: number) => number;
export declare const assertNodeErrorFree: (node: BinaryNode) => void;
export declare const reduceBinaryNodeToDictionary: (node: BinaryNode, tag: string) => {
    [_: string]: string;
};
export declare const getBinaryNodeMessages: ({ content }: BinaryNode) => proto.WebMessageInfo[];
export * from './generic-utils';
export * from './jid-utils';
export { Binary } from '../../WABinary/Binary';
export * from './types';
export * from './Legacy';
