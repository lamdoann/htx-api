import { EventEmitter } from 'events';

import {
  KlineInterval,
  KlineMessage,
  OrderUpdateMessage,
  SubscriptionResponse,
  TradeDetailMessage,
  WebsocketClientEvents,
  WebsocketClientOptions,
} from './types/websocket';
import { buildWsAuthParams } from './util/auth';
import { DefaultLogger, Logger } from './util/logger';
import { WsConnection } from './util/WsConnection';

export const DEFAULT_WS_URL = 'wss://api.huobi.pro/ws';
export const DEFAULT_ACCOUNT_WS_URL = 'wss://api.huobi.pro/ws/v2';

/** Build the trade-detail topic for a symbol, e.g. `market.btcusdt.trade.detail`. */
export function tradeTopic(symbol: string): string {
  return `market.${symbol.toLowerCase()}.trade.detail`;
}

/** Build the kline topic for a symbol, e.g. `market.btcusdt.kline.1min`. */
export function klineTopic(symbol: string, interval: KlineInterval): string {
  return `market.${symbol.toLowerCase()}.kline.${interval}`;
}

/** Build the private order channel, e.g. `orders#btcusdt` (or `orders#*`). */
export function ordersChannel(symbol: string): string {
  return `orders#${symbol.toLowerCase()}`;
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
export class WebsocketClient extends EventEmitter {
  private readonly options: Required<
    Pick<WebsocketClientOptions, 'wsUrl' | 'accountWsUrl' | 'reconnect' | 'reconnectIntervalMs'>
  > &
    Pick<WebsocketClientOptions, 'apiKey' | 'apiSecret'>;
  private readonly logger: Logger;

  private marketConn: WsConnection | null = null;
  private accountConn: WsConnection | null = null;

  /** Public market topics we want subscribed; replayed on reconnect. */
  private readonly marketSubs = new Set<string>();
  /** Private order channels we want subscribed; replayed after (re)auth. */
  private readonly orderSubs = new Set<string>();
  private accountAuthenticated = false;

  constructor(
    options: WebsocketClientOptions = {},
    logger: Logger = DefaultLogger,
  ) {
    super();
    this.options = {
      apiKey: options.apiKey,
      apiSecret: options.apiSecret,
      wsUrl: options.wsUrl ?? DEFAULT_WS_URL,
      accountWsUrl: options.accountWsUrl ?? DEFAULT_ACCOUNT_WS_URL,
      reconnect: options.reconnect ?? true,
      reconnectIntervalMs: options.reconnectIntervalMs ?? 2_000,
    };
    this.logger = logger;
  }

  /** Open the public market connection (private connection opens on demand). */
  connect(): void {
    this.ensureMarket().connect();
  }

  // --- public market subscriptions ----------------------------------------

  /** Subscribe to the trade-detail stream for one or more symbols. */
  subscribeTrades(symbols: string | string[]): void {
    this.subscribeMarket(toList(symbols).map(tradeTopic));
  }

  /** Unsubscribe from the trade-detail stream for one or more symbols. */
  unsubscribeTrades(symbols: string | string[]): void {
    this.unsubscribeMarket(toList(symbols).map(tradeTopic));
  }

  /** Subscribe to the kline stream for one or more symbols at a given interval. */
  subscribeKlines(symbols: string | string[], interval: KlineInterval): void {
    this.subscribeMarket(toList(symbols).map((s) => klineTopic(s, interval)));
  }

  /** Unsubscribe from the kline stream for one or more symbols. */
  unsubscribeKlines(symbols: string | string[], interval: KlineInterval): void {
    this.unsubscribeMarket(toList(symbols).map((s) => klineTopic(s, interval)));
  }

  // --- private order subscriptions ----------------------------------------

  /**
   * Subscribe to private order updates. Pass one or more symbols, or omit to
   * subscribe to all symbols (`orders#*`). Requires API credentials; the account
   * connection is opened and authenticated automatically.
   */
  subscribeOrders(symbols?: string | string[]): void {
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
  unsubscribeOrders(symbols?: string | string[]): void {
    const list = symbols === undefined ? ['*'] : toList(symbols);
    for (const channel of list.map(ordersChannel)) {
      this.orderSubs.delete(channel);
      this.accountConn?.send({ action: 'unsub', ch: channel });
    }
  }

  // --- lifecycle ----------------------------------------------------------

  /** Gracefully close all connections and stop reconnecting. */
  close(): void {
    this.marketConn?.close();
    this.accountConn?.close();
    this.accountAuthenticated = false;
  }

  /** Forcefully terminate all connections immediately and stop reconnecting. */
  terminate(): void {
    this.marketConn?.terminate();
    this.accountConn?.terminate();
    this.accountAuthenticated = false;
  }

  // --- internals ----------------------------------------------------------

  private subscribeMarket(topics: string[]): void {
    const conn = this.ensureMarket();
    for (const topic of topics) {
      this.marketSubs.add(topic);
      conn.send({ sub: topic, id: topic });
    }
    conn.connect();
  }

  private unsubscribeMarket(topics: string[]): void {
    for (const topic of topics) {
      this.marketSubs.delete(topic);
      this.marketConn?.send({ unsub: topic, id: topic });
    }
  }

  private ensureMarket(): WsConnection {
    if (!this.marketConn) {
      this.marketConn = new WsConnection({
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

  private ensureAccount(): WsConnection {
    if (!this.accountConn) {
      this.accountConn = new WsConnection({
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

  private routeMarket(message: unknown): void {
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
      this.emit('response', message as unknown as SubscriptionResponse);
      return;
    }

    const ch = message.ch;
    if (typeof ch === 'string' && message.tick) {
      if (ch.endsWith('.trade.detail')) {
        this.emit('trade', message as unknown as TradeDetailMessage);
      } else if (ch.includes('.kline.')) {
        this.emit('kline', message as unknown as KlineMessage);
      }
    }
  }

  private routeAccount(message: unknown): void {
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
      } else {
        this.emit(
          'error',
          new Error(
            `WebSocket auth failed (code ${message.code}): ${String(message.message ?? '')}`,
          ),
        );
      }
      return;
    }

    if (action === 'sub' || action === 'unsub') {
      this.emit('response', {
        status: message.code === 200 ? 'ok' : 'error',
        subbed: action === 'sub' ? (message.ch as string) : undefined,
        unsubbed: action === 'unsub' ? (message.ch as string) : undefined,
        ts: Date.now(),
        'err-code': message.code === 200 ? undefined : String(message.code),
        'err-msg': message.code === 200 ? undefined : String(message.message ?? ''),
      });
      return;
    }

    if (
      action === 'push' &&
      typeof message.ch === 'string' &&
      message.ch.startsWith('orders#')
    ) {
      this.emit('order', message as unknown as OrderUpdateMessage);
    }
  }

  private sendAuth(): void {
    if (!this.options.apiKey || !this.options.apiSecret) {
      this.emit(
        'error',
        new Error('apiKey and apiSecret are required for private channels.'),
      );
      return;
    }

    const url = new URL(this.options.accountWsUrl);
    const params = buildWsAuthParams({
      host: url.host,
      path: url.pathname,
      apiKey: this.options.apiKey,
      apiSecret: this.options.apiSecret,
    });

    this.accountConn?.send({ action: 'req', ch: 'auth', params });
  }
}

function toList(symbols: string | string[]): string[] {
  return Array.isArray(symbols) ? symbols : [symbols];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
