import { Logger } from './logger';
export interface WsConnectionParams {
    /** Human-readable name for logging, e.g. `"market"` / `"account"`. */
    name: string;
    url: string;
    /** Whether inbound frames are GZIP-compressed (true for the market `/ws`). */
    gzip: boolean;
    reconnect: boolean;
    reconnectIntervalMs: number;
    logger: Logger;
    onOpen: () => void;
    onMessage: (message: unknown) => void;
    onError: (error: Error) => void;
    onClose: () => void;
    onReconnecting: () => void;
}
/**
 * Single WebSocket connection with GZIP handling, JSON decoding and
 * auto-reconnect. Protocol concerns (ping/pong, auth, routing) are delegated to
 * the owner via `onMessage`/`onOpen`.
 */
export declare class WsConnection {
    private readonly params;
    private ws;
    private reconnectTimer;
    private closedByUser;
    constructor(params: WsConnectionParams);
    get isOpen(): boolean;
    connect(): void;
    send(payload: Record<string, unknown>): void;
    /** Graceful close; stops reconnecting. */
    close(): void;
    /** Forcefully tear down the socket immediately; stops reconnecting. */
    terminate(): void;
    private handleMessage;
    private handleClose;
    private scheduleReconnect;
    private clearReconnect;
    private toBuffer;
}
//# sourceMappingURL=WsConnection.d.ts.map