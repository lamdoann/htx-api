/**
 * Lifecycle state of a trading symbol.
 *
 * - `online`        – trading enabled
 * - `pre-online`    – listed but not yet trading
 * - `offline`       – delisted
 * - `suspend`       – trading temporarily halted
 * - `transfer-board`– being moved to another trading board
 * - `fuse`          – circuit-breaker / fuse triggered
 */
export type SymbolState =
  | 'online'
  | 'pre-online'
  | 'offline'
  | 'suspend'
  | 'transfer-board'
  | 'fuse';

/**
 * A single trading symbol as returned by `GET /v2/settings/common/symbols`.
 *
 * HTX uses short field names; the JSDoc on each property documents the meaning.
 * Only the most commonly used fields are typed explicitly — the API may return
 * additional fields which remain accessible via the index signature.
 */
export interface SymbolInfo {
  /**
   * Trading symbol, e.g. `"btcusdt"`. The HTX v2 endpoint does not return this
   * field; `fetchExchangeInfo` mirrors {@link SymbolInfo.sc} into it.
   */
  symbol: string;
  /** Symbol code (unique identifier as returned by HTX), e.g. `"btcusdt"`. */
  sc?: string;
  /** Display name, e.g. `"BTC/USDT"`. */
  dn?: string;
  /** Base currency, e.g. `"btc"`. */
  bc: string;
  /** Quote currency, e.g. `"usdt"`. */
  qc: string;
  /** Symbol lifecycle state. */
  state: SymbolState;
  /** Base currency display name. */
  bcdn?: string;
  /** Quote currency display name. */
  qcdn?: string;
  /** Trade price precision (number of decimal places). */
  tpp?: number;
  /** Trade amount precision (number of decimal places). */
  tap?: number;
  /** Trade total (value) precision (number of decimal places). */
  ttp?: number;
  /** Minimum order amount. */
  minoa?: number;
  /** Maximum order amount. */
  maxoa?: number;
  /** Minimum order value. */
  minov?: number;
  /** Limit order minimum order amount. */
  lominoa?: number;
  /** Limit order maximum order amount. */
  lomaxoa?: number;
  /** Market sell order maximum order amount. */
  smminoa?: number;
  /** Market buy order maximum order value. */
  bmmaxov?: number;
  /** Allow any extra fields HTX may add without breaking typing. */
  [key: string]: unknown;
}

/**
 * Normalised result of {@link RestClient.fetchExchangeInfo}.
 *
 * Mirrors the `exchangeInfo` concept from the binance SDK: a single object that
 * carries the list of tradable symbols plus the server timestamp it was fetched.
 */
export interface ExchangeInfo {
  symbols: SymbolInfo[];
  /** Server timestamp (ms) the data was generated. */
  timestamp?: number;
}
