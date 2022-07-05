import type { Logger } from 'pino';
import type { AuthenticationCreds, AuthenticationState, SignalKeyStore, SignalKeyStoreWithTransaction } from '../Types';
export declare const addTransactionCapability: (state: SignalKeyStore, logger: Logger) => SignalKeyStoreWithTransaction;
export declare const initAuthCreds: () => AuthenticationCreds;
/** stores the full authentication state in a single JSON file */
export declare const useSingleFileAuthState: (filename: string, logger?: Logger) => {
    state: AuthenticationState;
    saveState: () => void;
};
