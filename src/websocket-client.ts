import { EventEmitter } from 'events';
import { gunzipSync } from 'zlib';
import WebSocket, { RawData } from 'ws';

import {
  SubscriptionResponse,
  TradeDetailMessage,
  WebsocketClientEvents,
  WebsocketClientOptions,
} from './types/websocket';
import { DefaultLogger, Logger } from './util/logger';

export const DEFAULT_WS_URL = 'wss://api.huobi.pro/ws';

/** Build the trade-detail topic string for a symbol, e.g. `market.btcusdt.trade.detail`. */
export function tradeTopic(symbol: string): string {
  return `market.${symbol.toLowerCase()}.trade.detail`;
}

// Strongly-typed EventEmitter surface.
export interface WebsocketClient {
  on<E extends keyof WebsocketClientEvents>(
    event: E,
    listener: WebsocketClientEvents[E],
  ): this;
  once<E extends keyof WebsocketClientEvents>(
    event: E,
    listener: WebsocketClientEvents[E],
  ): this;
  off<E extends keyof WebsocketClientEvents>(
    event: E,
    listener: WebsocketClientEvents[E],
  ): this;
  emit<E extends keyof WebsocketClientEvents>(
    event: E,
    ...args: Parameters<WebsocketClientEvents[E]>
  ): boolean;
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
export class WebsocketClient extends EventEmitter {
  private readonly wsUrl: string;
  private readonly reconnect: boolean;
  private readonly reconnectIntervalMs: number;
  private readonly logger: Logger;

  private ws: WebSocket | null = null;
  /** Topics we want subscribed; replayed on reconnect. */
  private readonly subscriptions = new Set<string>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private closedByUser = false;

  constructor(
    options: WebsocketClientOptions = {},
    logger: Logger = DefaultLogger,
  ) {
    super();
    this.wsUrl = options.wsUrl ?? DEFAULT_WS_URL;
    this.reconnect = options.reconnect ?? true;
    this.reconnectIntervalMs = options.reconnectIntervalMs ?? 2_000;
    this.logger = logger;
  }

  /** Open the WebSocket connection. */
  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.closedByUser = false;
    this.logger.info(`Connecting to ${this.wsUrl}`);

    const ws = new WebSocket(this.wsUrl);
    this.ws = ws;

    ws.on('open', () => this.onOpen());
    ws.on('message', (data) => this.onMessage(data));
    ws.on('error', (err) => this.emit('error', err));
    ws.on('close', () => this.onClose());
  }

  /** Subscribe to the trade-detail stream for one or more symbols. */
  subscribeTrades(symbols: string | string[]): void {
    const list = Array.isArray(symbols) ? symbols : [symbols];
    for (const symbol of list) {
      const topic = tradeTopic(symbol);
      this.subscriptions.add(topic);
      this.sendSub(topic);
    }
  }

  /** Unsubscribe from the trade-detail stream for one or more symbols. */
  unsubscribeTrades(symbols: string | string[]): void {
    const list = Array.isArray(symbols) ? symbols : [symbols];
    for (const symbol of list) {
      const topic = tradeTopic(symbol);
      this.subscriptions.delete(topic);
      this.send({ unsub: topic, id: topic });
    }
  }

  /** Close the connection and stop reconnecting. */
  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  // --- internals ----------------------------------------------------------

  private onOpen(): void {
    this.logger.info('WebSocket connected');
    this.emit('open');
    // Replay any topics requested before/across (re)connects.
    for (const topic of this.subscriptions) {
      this.sendSub(topic);
    }
  }

  private onClose(): void {
    this.logger.info('WebSocket closed');
    this.emit('close');
    if (this.reconnect && !this.closedByUser) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
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

  private onMessage(raw: RawData): void {
    let decoded: unknown;
    try {
      // HTX market frames are gzip-compressed binary.
      const buffer = this.toBuffer(raw);
      const text = gunzipSync(buffer).toString('utf-8');
      decoded = JSON.parse(text);
    } catch (err) {
      this.emit('error', err as Error);
      return;
    }

    this.emit('message', decoded);
    this.routeMessage(decoded);
  }

  private routeMessage(message: unknown): void {
    if (typeof message !== 'object' || message === null) {
      return;
    }
    const msg = message as Record<string, unknown>;

    // Heartbeat: { "ping": <number> } -> reply { "pong": <number> }.
    if (typeof msg.ping === 'number') {
      this.send({ pong: msg.ping });
      return;
    }

    // Subscribe / unsubscribe acknowledgement.
    if (typeof msg.subbed === 'string' || typeof msg.unsubbed === 'string') {
      this.emit('response', message as SubscriptionResponse);
      return;
    }

    // Data push: { ch: "market.<symbol>.trade.detail", tick: {...} }.
    if (
      typeof msg.ch === 'string' &&
      msg.ch.endsWith('.trade.detail') &&
      msg.tick
    ) {
      this.emit('trade', message as TradeDetailMessage);
    }
  }

  private sendSub(topic: string): void {
    this.send({ sub: topic, id: topic });
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      this.logger.debug('Socket not open; dropping outbound message', payload);
      return;
    }
    this.ws.send(JSON.stringify(payload));
  }

  private toBuffer(raw: RawData): Buffer {
    if (Buffer.isBuffer(raw)) {
      return raw;
    }
    if (Array.isArray(raw)) {
      return Buffer.concat(raw);
    }
    return Buffer.from(raw as ArrayBuffer);
  }
}
