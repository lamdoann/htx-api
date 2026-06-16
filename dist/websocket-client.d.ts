import { EventEmitter } from 'events';
import { KlineInterval, WebsocketClientEvents, WebsocketClientOptions } from './types/websocket';
import { Logger } from './util/logger';
export declare const DEFAULT_WS_URL = "wss://api.huobi.pro/ws";
export declare const DEFAULT_ACCOUNT_WS_URL = "wss://api.huobi.pro/ws/v2";
/** Build the trade-detail topic for a symbol, e.g. `market.btcusdt.trade.detail`. */
export declare function tradeTopic(symbol: string): string;
/** Build the kline topic for a symbol, e.g. `market.btcusdt.kline.1min`. */
export declare function klineTopic(symbol: string, interval: KlineInterval): string;
/** Build the private order channel, e.g. `orders#btcusdt` (or `orders#*`). */
export declare function ordersChannel(symbol: string): string;
export interface WebsocketClient {
    on<E extends keyof WebsocketClientEvents>(event: E, listener: WebsocketClientEvents[E]): this;
    once<E extends keyof WebsocketClientEvents>(event: E, listener: WebsocketClientEvents[E]): this;
    off<E extends keyof WebsocketClientEvents>(event: E, listener: WebsocketClientEvents[E]): this;
    emit<E extends keyof WebsocketClientEvents>(event: E, ...args: Parameters<WebsocketClientEvents[E]>): boolean;
}
/**
 * HTX (Huobi) Spot WebSocket client.
 *
 * Manages two underlying sockets, created lazily as needed:
 *  - **market** (`wss://api.huobi.pro/ws`) — public trade & kline streams.
 *    Frames are GZIP-compressed; heartbeat is `{"ping":n}` → `{"pong":n}`.
 *  - **account** (`wss://api.huobi.pro/ws/v2`) — private order updates. Frames
 *    are plain JSON; heartbeat is `{"action":"ping"}` → `{"action":"pong"}`;
 *    requires API key/secret auth before subscribing.
 *
 * Subscriptions are remembered and replayed on reconnect.
 *
 * @example
 * ```ts
 * const ws = new WebsocketClient({ apiKey: '...', apiSecret: '...' });
 * ws.on('trade', (m) => console.log(m.tick.data));
 * ws.on('order', (m) => console.log(m.data));
 * ws.subscribeTrades('btcusdt');
 * ws.subscribeKlines('btcusdt', '1min');
 * ws.subscribeOrders('btcusdt');
 * ```
 */
export declare class WebsocketClient extends EventEmitter {
    private readonly options;
    private readonly logger;
    private marketConn;
    private accountConn;
    /** Public market topics we want subscribed; replayed on reconnect. */
    private readonly marketSubs;
    /** Private order channels we want subscribed; replayed after (re)auth. */
    private readonly orderSubs;
    private accountAuthenticated;
    constructor(options?: WebsocketClientOptions, logger?: Logger);
    /** Open the public market connection (private connection opens on demand). */
    connect(): void;
    /** Subscribe to the trade-detail stream for one or more symbols. */
    subscribeTrades(symbols: string | string[]): void;
    /** Unsubscribe from the trade-detail stream for one or more symbols. */
    unsubscribeTrades(symbols: string | string[]): void;
    /** Subscribe to the kline stream for one or more symbols at a given interval. */
    subscribeKlines(symbols: string | string[], interval: KlineInterval): void;
    /** Unsubscribe from the kline stream for one or more symbols. */
    unsubscribeKlines(symbols: string | string[], interval: KlineInterval): void;
    /**
     * Subscribe to private order updates. Pass one or more symbols, or omit to
     * subscribe to all symbols (`orders#*`). Requires API credentials; the account
     * connection is opened and authenticated automatically.
     */
    subscribeOrders(symbols?: string | string[]): void;
    /** Unsubscribe from private order updates. */
    unsubscribeOrders(symbols?: string | string[]): void;
    /** Gracefully close all connections and stop reconnecting. */
    close(): void;
    /** Forcefully terminate all connections immediately and stop reconnecting. */
    terminate(): void;
    private subscribeMarket;
    private unsubscribeMarket;
    private ensureMarket;
    private ensureAccount;
    private routeMarket;
    private routeAccount;
    private sendAuth;
}
//# sourceMappingURL=websocket-client.d.ts.map