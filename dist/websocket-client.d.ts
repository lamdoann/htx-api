import { EventEmitter } from 'events';
import { WebsocketClientEvents, WebsocketClientOptions } from './types/websocket';
import { Logger } from './util/logger';
export declare const DEFAULT_WS_URL = "wss://api.huobi.pro/ws";
/** Build the trade-detail topic string for a symbol, e.g. `market.btcusdt.trade.detail`. */
export declare function tradeTopic(symbol: string): string;
export interface WebsocketClient {
    on<E extends keyof WebsocketClientEvents>(event: E, listener: WebsocketClientEvents[E]): this;
    once<E extends keyof WebsocketClientEvents>(event: E, listener: WebsocketClientEvents[E]): this;
    off<E extends keyof WebsocketClientEvents>(event: E, listener: WebsocketClientEvents[E]): this;
    emit<E extends keyof WebsocketClientEvents>(event: E, ...args: Parameters<WebsocketClientEvents[E]>): boolean;
}
/**
 * HTX (Huobi) Spot market-data WebSocket client, focused on trade streams.
 *
 * Handles the three protocol quirks of the HTX `/ws` market endpoint:
 *  1. inbound frames are GZIP-compressed and must be inflated,
 *  2. the server sends `{"ping": <n>}` heartbeats that must be answered with
 *     `{"pong": <n>}`,
 *  3. subscriptions use `{"sub": "<topic>", "id": "<id>"}`.
 *
 * @example
 * ```ts
 * const ws = new WebsocketClient();
 * ws.on('trade', (msg) => console.log(msg.tick.data));
 * ws.connect();
 * ws.subscribeTrades('btcusdt');
 * ```
 */
export declare class WebsocketClient extends EventEmitter {
    private readonly wsUrl;
    private readonly reconnect;
    private readonly reconnectIntervalMs;
    private readonly logger;
    private ws;
    /** Topics we want subscribed; replayed on reconnect. */
    private readonly subscriptions;
    private reconnectTimer;
    private closedByUser;
    constructor(options?: WebsocketClientOptions, logger?: Logger);
    /** Open the WebSocket connection. */
    connect(): void;
    /** Subscribe to the trade-detail stream for one or more symbols. */
    subscribeTrades(symbols: string | string[]): void;
    /** Unsubscribe from the trade-detail stream for one or more symbols. */
    unsubscribeTrades(symbols: string | string[]): void;
    /** Close the connection and stop reconnecting. */
    close(): void;
    private onOpen;
    private onClose;
    private scheduleReconnect;
    private onMessage;
    private routeMessage;
    private sendSub;
    private send;
    private toBuffer;
}
//# sourceMappingURL=websocket-client.d.ts.map