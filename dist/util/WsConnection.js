"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsConnection = void 0;
const zlib_1 = require("zlib");
const ws_1 = __importDefault(require("ws"));
/**
 * Single WebSocket connection with GZIP handling, JSON decoding and
 * auto-reconnect. Protocol concerns (ping/pong, auth, routing) are delegated to
 * the owner via `onMessage`/`onOpen`.
 */
class WsConnection {
    constructor(params) {
        this.params = params;
        this.ws = null;
        this.reconnectTimer = null;
        this.closedByUser = false;
    }
    get isOpen() {
        return this.ws?.readyState === ws_1.default.OPEN;
    }
    connect() {
        if (this.ws &&
            (this.ws.readyState === ws_1.default.OPEN ||
                this.ws.readyState === ws_1.default.CONNECTING)) {
            return;
        }
        this.closedByUser = false;
        this.params.logger.info(`[${this.params.name}] connecting to ${this.params.url}`);
        const ws = new ws_1.default(this.params.url);
        this.ws = ws;
        ws.on('open', () => {
            this.params.logger.info(`[${this.params.name}] connected`);
            this.params.onOpen();
        });
        ws.on('message', (data) => this.handleMessage(data));
        ws.on('error', (err) => this.params.onError(err));
        ws.on('close', () => this.handleClose());
    }
    send(payload) {
        if (!this.isOpen) {
            this.params.logger.debug(`[${this.params.name}] socket not open; dropping message`, payload);
            return;
        }
        this.ws.send(JSON.stringify(payload));
    }
    /** Graceful close; stops reconnecting. */
    close() {
        this.closedByUser = true;
        this.clearReconnect();
        this.ws?.close();
        this.ws = null;
    }
    /** Forcefully tear down the socket immediately; stops reconnecting. */
    terminate() {
        this.closedByUser = true;
        this.clearReconnect();
        this.ws?.terminate();
        this.ws = null;
    }
    handleMessage(raw) {
        try {
            const buffer = this.toBuffer(raw);
            const text = this.params.gzip
                ? (0, zlib_1.gunzipSync)(buffer).toString('utf-8')
                : buffer.toString('utf-8');
            this.params.onMessage(JSON.parse(text));
        }
        catch (err) {
            this.params.onError(err);
        }
    }
    handleClose() {
        this.params.logger.info(`[${this.params.name}] closed`);
        this.params.onClose();
        if (this.params.reconnect && !this.closedByUser) {
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }
        this.params.onReconnecting();
        this.params.logger.info(`[${this.params.name}] reconnecting in ${this.params.reconnectIntervalMs}ms`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.params.reconnectIntervalMs);
    }
    clearReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
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
exports.WsConnection = WsConnection;
//# sourceMappingURL=WsConnection.js.map