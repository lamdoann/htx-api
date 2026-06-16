"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketClient = exports.DEFAULT_WS_URL = void 0;
exports.tradeTopic = tradeTopic;
const events_1 = require("events");
const zlib_1 = require("zlib");
const ws_1 = __importDefault(require("ws"));
const logger_1 = require("./util/logger");
exports.DEFAULT_WS_URL = 'wss://api.huobi.pro/ws';
/** Build the trade-detail topic string for a symbol, e.g. `market.btcusdt.trade.detail`. */
function tradeTopic(symbol) {
    return `market.${symbol.toLowerCase()}.trade.detail`;
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
class WebsocketClient extends events_1.EventEmitter {
    constructor(options = {}, logger = logger_1.DefaultLogger) {
        super();
        this.ws = null;
        /** Topics we want subscribed; replayed on reconnect. */
        this.subscriptions = new Set();
        this.reconnectTimer = null;
        this.closedByUser = false;
        this.wsUrl = options.wsUrl ?? exports.DEFAULT_WS_URL;
        this.reconnect = options.reconnect ?? true;
        this.reconnectIntervalMs = options.reconnectIntervalMs ?? 2000;
        this.logger = logger;
    }
    /** Open the WebSocket connection. */
    connect() {
        if (this.ws &&
            (this.ws.readyState === ws_1.default.OPEN ||
                this.ws.readyState === ws_1.default.CONNECTING)) {
            return;
        }
        this.closedByUser = false;
        this.logger.info(`Connecting to ${this.wsUrl}`);
        const ws = new ws_1.default(this.wsUrl);
        this.ws = ws;
        ws.on('open', () => this.onOpen());
        ws.on('message', (data) => this.onMessage(data));
        ws.on('error', (err) => this.emit('error', err));
        ws.on('close', () => this.onClose());
    }
    /** Subscribe to the trade-detail stream for one or more symbols. */
    subscribeTrades(symbols) {
        const list = Array.isArray(symbols) ? symbols : [symbols];
        for (const symbol of list) {
            const topic = tradeTopic(symbol);
            this.subscriptions.add(topic);
            this.sendSub(topic);
        }
    }
    /** Unsubscribe from the trade-detail stream for one or more symbols. */
    unsubscribeTrades(symbols) {
        const list = Array.isArray(symbols) ? symbols : [symbols];
        for (const symbol of list) {
            const topic = tradeTopic(symbol);
            this.subscriptions.delete(topic);
            this.send({ unsub: topic, id: topic });
        }
    }
    /** Close the connection and stop reconnecting. */
    close() {
        this.closedByUser = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        this.ws?.close();
        this.ws = null;
    }
    // --- internals ----------------------------------------------------------
    onOpen() {
        this.logger.info('WebSocket connected');
        this.emit('open');
        // Replay any topics requested before/across (re)connects.
        for (const topic of this.subscriptions) {
            this.sendSub(topic);
        }
    }
    onClose() {
        this.logger.info('WebSocket closed');
        this.emit('close');
        if (this.reconnect && !this.closedByUser) {
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }
        this.emit('reconnecting');
        this.logger.info(`Reconnecting in ${this.reconnectIntervalMs}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectIntervalMs);
    }
    onMessage(raw) {
        let decoded;
        try {
            // HTX market frames are gzip-compressed binary.
            const buffer = this.toBuffer(raw);
            const text = (0, zlib_1.gunzipSync)(buffer).toString('utf-8');
            decoded = JSON.parse(text);
        }
        catch (err) {
            this.emit('error', err);
            return;
        }
        this.emit('message', decoded);
        this.routeMessage(decoded);
    }
    routeMessage(message) {
        if (typeof message !== 'object' || message === null) {
            return;
        }
        const msg = message;
        // Heartbeat: { "ping": <number> } -> reply { "pong": <number> }.
        if (typeof msg.ping === 'number') {
            this.send({ pong: msg.ping });
            return;
        }
        // Subscribe / unsubscribe acknowledgement.
        if (typeof msg.subbed === 'string' || typeof msg.unsubbed === 'string') {
            this.emit('response', message);
            return;
        }
        // Data push: { ch: "market.<symbol>.trade.detail", tick: {...} }.
        if (typeof msg.ch === 'string' &&
            msg.ch.endsWith('.trade.detail') &&
            msg.tick) {
            this.emit('trade', message);
        }
    }
    sendSub(topic) {
        this.send({ sub: topic, id: topic });
    }
    send(payload) {
        if (this.ws?.readyState !== ws_1.default.OPEN) {
            this.logger.debug('Socket not open; dropping outbound message', payload);
            return;
        }
        this.ws.send(JSON.stringify(payload));
    }
    toBuffer(raw) {
        if (Buffer.isBuffer(raw)) {
            return raw;
        }
        if (Array.isArray(raw)) {
            return Buffer.concat(raw);
        }
        return Buffer.from(raw);
    }
}
exports.WebsocketClient = WebsocketClient;
//# sourceMappingURL=websocket-client.js.map