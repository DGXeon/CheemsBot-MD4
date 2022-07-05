import type { Logger } from 'pino';
import { proto } from '../../WAProto';
import { BaileysEventMap, SignalKeyStoreWithTransaction } from '../Types';
declare type ProcessMessageContext = {
    historyCache: Set<string>;
    meId: string;
    keyStore: SignalKeyStoreWithTransaction;
    logger?: Logger;
    treatCiphertextMessagesAsReal?: boolean;
};
declare const processMessage: (message: proto.IWebMessageInfo, { historyCache, meId, keyStore, logger, treatCiphertextMessagesAsReal }: ProcessMessageContext) => Promise<Partial<BaileysEventMap<any>>>;
export default processMessage;
