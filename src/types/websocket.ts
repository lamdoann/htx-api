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
   * Override the market data WebSocket URL.
   * @default "wss://api.huobi.pro/ws"
   */
  wsUrl?: string;
  /**
   * Automatically reconnect when the socket closes unexpectedly.
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
  /** A subscribe/unsubscribe acknowledgement was received. */
  response: (message: SubscriptionResponse) => void;
  /** Any decoded inbound message (raw), useful for debugging. */
  message: (message: unknown) => void;
  /** A transport or protocol error occurred. */
  error: (error: Error) => void;
  /** Socket closed. */
  close: () => void;
  /** A reconnect attempt is starting. */
  reconnecting: () => void;
}
