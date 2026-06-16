/**
 * A single executed trade inside a `market.$symbol.trade.detail` push.
 */
export interface TradeDetail {
  /** Deprecated unique id — prefer {@link TradeDetail.tradeId}. */
  id: number;
  /** Unique trade id. Use this for de-duplication. */
  tradeId: number;
  /** Trade amount (in base currency). */
  amount: number;
  /** Trade price. */
  price: number;
  /** Trade timestamp (ms). */
  ts: number;
  /** Aggressor side of the trade. */
  direction: 'buy' | 'sell';
}

export interface TradeDetailTick {
  /** Message id. */
  id: number;
  /** Tick timestamp (ms). */
  ts: number;
  /** Trades included in this push. */
  data: TradeDetail[];
}

/**
 * Data push for a subscribed trade-detail topic.
 */
export interface TradeDetailMessage {
  /** Channel, e.g. `"market.btcusdt.trade.detail"`. */
  ch: string;
  /** Push timestamp (ms). */
  ts: number;
  tick: TradeDetailTick;
}

/**
 * Candlestick (kline) period supported by HTX market data.
 */
export type KlineInterval =
  | '1min'
  | '5min'
  | '15min'
  | '30min'
  | '60min'
  | '4hour'
  | '1day'
  | '1mon'
  | '1week'
  | '1year';

export interface Kline {
  /** Candle id (open time, unix seconds). */
  id: number;
  open: number;
  close: number;
  low: number;
  high: number;
  /** Trading volume in base currency. */
  amount: number;
  /** Trading value in quote currency. */
  vol: number;
  /** Number of trades. */
  count: number;
}

/**
 * Data push for a subscribed kline topic (`market.$symbol.kline.$period`).
 */
export interface KlineMessage {
  /** Channel, e.g. `"market.btcusdt.kline.1min"`. */
  ch: string;
  /** Push timestamp (ms). */
  ts: number;
  tick: Kline;
}

/**
 * Order update pushed on the private account WebSocket (`orders#$symbol`).
 *
 * Fields vary by `eventType` (`creation`, `trade`, `cancellation`, …); the most
 * common are typed here with an index signature for the rest.
 */
export interface OrderUpdate {
  symbol: string;
  /** `creation` | `trade` | `cancellation` | `deletion` | `trigger`. */
  eventType: string;
  orderId?: number;
  clientOrderId?: string;
  orderStatus?: string;
  type?: string;
  orderPrice?: string;
  orderSize?: string;
  tradePrice?: string;
  tradeVolume?: string;
  [key: string]: unknown;
}

/**
 * Envelope for a private order push (`{ action: "push", ch: "orders#...", data }`).
 */
export interface OrderUpdateMessage {
  action: 'push';
  ch: string;
  data: OrderUpdate;
}

/**
 * Acknowledgement HTX sends in response to a `sub` / `unsub` request.
 */
export interface SubscriptionResponse {
  id?: string;
  status: 'ok' | 'error';
  subbed?: string;
  unsubbed?: string;
  ts: number;
  'err-code'?: string;
  'err-msg'?: string;
}

export interface WebsocketClientOptions {
  /**
   * API key. Required only for private channels (e.g. `subscribeOrders`).
   */
  apiKey?: string;
  /**
   * API secret. Required only for private channels.
   */
  apiSecret?: string;
  /**
   * Override the public market data WebSocket URL.
   * @default "wss://api.huobi.pro/ws"
   */
  wsUrl?: string;
  /**
   * Override the private account/order WebSocket URL (v2).
   * @default "wss://api.huobi.pro/ws/v2"
   */
  accountWsUrl?: string;
  /**
   * Automatically reconnect when a socket closes unexpectedly.
   * @default true
   */
  reconnect?: boolean;
  /**
   * Delay between reconnect attempts, in milliseconds.
   * @default 2000
   */
  reconnectIntervalMs?: number;
}

/**
 * Events emitted by {@link WebsocketClient}.
 */
export interface WebsocketClientEvents {
  /** Socket connected and ready to accept subscriptions. */
  open: () => void;
  /** A trade-detail data push was received. */
  trade: (message: TradeDetailMessage) => void;
  /** A kline data push was received. */
  kline: (message: KlineMessage) => void;
  /** A private order update was received. */
  order: (message: OrderUpdateMessage) => void;
  /** The private account WebSocket authenticated successfully. */
  authenticated: () => void;
  /** A subscribe/unsubscribe acknowledgement was received. */
  response: (message: SubscriptionResponse) => void;
  /** Any decoded inbound message (raw), useful for debugging. */
  message: (message: unknown) => void;
  /** A transport or protocol error occurred. */
  error: (error: Error) => void;
  /** A socket closed. */
  close: () => void;
  /** A reconnect attempt is starting. */
  reconnecting: () => void;
}
