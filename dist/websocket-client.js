"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketClient = exports.DEFAULT_ACCOUNT_WS_URL = exports.DEFAULT_WS_URL = void 0;
exports.tradeTopic = tradeTopic;
exports.klineTopic = klineTopic;
exports.ordersChannel = ordersChannel;
const events_1 = require("events");
const auth_1 = require("./util/auth");
const logger_1 = require("./util/logger");
const WsConnection_1 = require("./util/WsConnection");
exports.DEFAULT_WS_URL = 'wss://api.huobi.pro/ws';
exports.DEFAULT_ACCOUNT_WS_URL = 'wss://api.huobi.pro/ws/v2';
/** Build the trade-detail topic for a symbol, e.g. `market.btcusdt.trade.detail`. */
function tradeTopic(symbol) {
    return `market.${symbol.toLowerCase()}.trade.detail`;
}
/** Build the kline topic for a symbol, e.g. `market.btcusdt.kline.1min`. */
function klineTopic(symbol, interval) {
    return `market.${symbol.toLowerCase()}.kline.${interval}`;
}
/** Build the private order channel, e.g. `orders#btcusdt` (or `orders#*`). */
function ordersChannel(symbol) {
    return `orders#${symbol.toLowerCase()}`;
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
class WebsocketClient extends events_1.EventEmitter {
    constructor(options = {}, logger = logger_1.DefaultLogger) {
        super();
        this.marketConn = null;
        this.accountConn = null;
        /** Public market topics we want subscribed; replayed on reconnect. */
        this.marketSubs = new Set();
        /** Private order channels we want subscribed; replayed after (re)auth. */
        this.orderSubs = new Set();
        this.accountAuthenticated = false;
        this.options = {
            apiKey: options.apiKey,
            apiSecret: options.apiSecret,
            wsUrl: options.wsUrl ?? exports.DEFAULT_WS_URL,
            accountWsUrl: options.accountWsUrl ?? exports.DEFAULT_ACCOUNT_WS_URL,
            reconnect: options.reconnect ?? true,
            reconnectIntervalMs: options.reconnectIntervalMs ?? 2000,
        };
        this.logger = logger;
    }
    /** Open the public market connection (private connection opens on demand). */
    connect() {
        this.ensureMarket().connect();
    }
    // --- public market subscriptions ----------------------------------------
    /** Subscribe to the trade-detail stream for one or more symbols. */
    subscribeTrades(symbols) {
        this.subscribeMarket(toList(symbols).map(tradeTopic));
    }
    /** Unsubscribe from the trade-detail stream for one or more symbols. */
    unsubscribeTrades(symbols) {
        this.unsubscribeMarket(toList(symbols).map(tradeTopic));
    }
    /** Subscribe to the kline stream for one or more symbols at a given interval. */
    subscribeKlines(symbols, interval) {
        this.subscribeMarket(toList(symbols).map((s) => klineTopic(s, interval)));
    }
    /** Unsubscribe from the kline stream for one or more symbols. */
    unsubscribeKlines(symbols, interval) {
        this.unsubscribeMarket(toList(symbols).map((s) => klineTopic(s, interval)));
    }
    // --- private order subscriptions ----------------------------------------
    /**
     * Subscribe to private order updates. Pass one or more symbols, or omit to
     * subscribe to all symbols (`orders#*`). Requires API credentials; the account
     * connection is opened and authenticated automatically.
     */
    subscribeOrders(symbols) {
        const list = symbols === undefined ? ['*'] : toList(symbols);
        for (const channel of list.map(ordersChannel)) {
            this.orderSubs.add(channel);
            if (this.accountAuthenticated) {
                this.accountConn?.send({ action: 'sub', ch: channel });
            }
        }
        this.ensureAccount().connect();
    }
    /** Unsubscribe from private order updates. */
    unsubscribeOrders(symbols) {
        const list = symbols === undefined ? ['*'] : toList(symbols);
        for (const channel of list.map(ordersChannel)) {
            this.orderSubs.delete(channel);
            this.accountConn?.send({ action: 'unsub', ch: channel });
        }
    }
    // --- lifecycle ----------------------------------------------------------
    /** Gracefully close all connections and stop reconnecting. */
    close() {
        this.marketConn?.close();
        this.accountConn?.close();
        this.accountAuthenticated = false;
    }
    /** Forcefully terminate all connections immediately and stop reconnecting. */
    terminate() {
        this.marketConn?.terminate();
        this.accountConn?.terminate();
        this.accountAuthenticated = false;
    }
    // --- internals ----------------------------------------------------------
    subscribeMarket(topics) {
        const conn = this.ensureMarket();
        for (const topic of topics) {
            this.marketSubs.add(topic);
            conn.send({ sub: topic, id: topic });
        }
        conn.connect();
    }
    unsubscribeMarket(topics) {
        for (const topic of topics) {
            this.marketSubs.delete(topic);
            this.marketConn?.send({ unsub: topic, id: topic });
        }
    }
    ensureMarket() {
        if (!this.marketConn) {
            this.marketConn = new WsConnection_1.WsConnection({
                name: 'market',
                url: this.options.wsUrl,
                gzip: true,
                reconnect: this.options.reconnect,
                reconnectIntervalMs: this.options.reconnectIntervalMs,
                logger: this.logger,
                onOpen: () => {
                    this.emit('open');
                    for (const topic of this.marketSubs) {
                        this.marketConn?.send({ sub: topic, id: topic });
                    }
                },
                onMessage: (msg) => this.routeMarket(msg),
                onError: (err) => this.emit('error', err),
                onClose: () => this.emit('close'),
                onReconnecting: () => this.emit('reconnecting'),
            });
        }
        return this.marketConn;
    }
    ensureAccount() {
        if (!this.accountConn) {
            this.accountConn = new WsConnection_1.WsConnection({
                name: 'account',
                url: this.options.accountWsUrl,
                gzip: false,
                reconnect: this.options.reconnect,
                reconnectIntervalMs: this.options.reconnectIntervalMs,
                logger: this.logger,
                onOpen: () => this.sendAuth(),
                onMessage: (msg) => this.routeAccount(msg),
                onError: (err) => this.emit('error', err),
                onClose: () => {
                    this.accountAuthenticated = false;
                    this.emit('close');
                },
                onReconnecting: () => this.emit('reconnecting'),
            });
        }
        return this.accountConn;
    }
    routeMarket(message) {
        this.emit('message', message);
        if (!isObject(message)) {
            return;
        }
        // Heartbeat: { "ping": <number> } -> { "pong": <number> }.
        if (typeof message.ping === 'number') {
            this.marketConn?.send({ pong: message.ping });
            return;
        }
        if (typeof message.subbed === 'string' || typeof message.unsubbed === 'string') {
            this.emit('response', message);
            return;
        }
        const ch = message.ch;
        if (typeof ch === 'string' && message.tick) {
            if (ch.endsWith('.trade.detail')) {
                this.emit('trade', message);
            }
            else if (ch.includes('.kline.')) {
                this.emit('kline', message);
            }
        }
    }
    routeAccount(message) {
        this.emit('message', message);
        if (!isObject(message)) {
            return;
        }
        const action = message.action;
        // Heartbeat: { action: "ping", data: { ts } } -> { action: "pong", data: { ts } }.
        if (action === 'ping') {
            const data = isObject(message.data) ? message.data : {};
            this.accountConn?.send({ action: 'pong', data });
            return;
        }
        if (action === 'req' && message.ch === 'auth') {
            if (message.code === 200) {
                this.accountAuthenticated = true;
                this.logger.info('[account] authenticated');
                this.emit('authenticated');
                for (const channel of this.orderSubs) {
                    this.accountConn?.send({ action: 'sub', ch: channel });
                }
            }
            else {
                this.emit('error', new Error(`WebSocket auth failed (code ${message.code}): ${String(message.message ?? '')}`));
            }
            return;
        }
        if (action === 'sub' || action === 'unsub') {
            this.emit('response', {
                status: message.code === 200 ? 'ok' : 'error',
                subbed: action === 'sub' ? message.ch : undefined,
                unsubbed: action === 'unsub' ? message.ch : undefined,
                ts: Date.now(),
                'err-code': message.code === 200 ? undefined : String(message.code),
                'err-msg': message.code === 200 ? undefined : String(message.message ?? ''),
            });
            return;
        }
        if (action === 'push' &&
            typeof message.ch === 'string' &&
            message.ch.startsWith('orders#')) {
            this.emit('order', message);
        }
    }
    sendAuth() {
        if (!this.options.apiKey || !this.options.apiSecret) {
            this.emit('error', new Error('apiKey and apiSecret are required for private channels.'));
            return;
        }
        const url = new URL(this.options.accountWsUrl);
        const params = (0, auth_1.buildWsAuthParams)({
            host: url.host,
            path: url.pathname,
            apiKey: this.options.apiKey,
            apiSecret: this.options.apiSecret,
        });
        this.accountConn?.send({ action: 'req', ch: 'auth', params });
    }
}
exports.WebsocketClient = WebsocketClient;
function toList(symbols) {
    return Array.isArray(symbols) ? symbols : [symbols];
}
function isObject(value) {
    return typeof value === 'object' && value !== null;
}
//# sourceMappingURL=websocket-client.js.map