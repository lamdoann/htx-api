/**
 * Standard envelope returned by HTX REST endpoints.
 *
 * Successful responses have `status: "ok"`. Errors carry `err-code` / `err-msg`.
 */
export interface HtxRestResponse<TData> {
  status: 'ok' | 'error';
  data: TData;
  /** Server timestamp (ms), present on most endpoints. */
  ts?: string | number;
  /** Whether the full dataset is returned (used by the symbols endpoint). */
  full?: number;
  'err-code'?: string;
  'err-msg'?: string;
}

export interface RestClientOptions {
  /**
   * API key. Required only for private (signed) endpoints.
   */
  apiKey?: string;
  /**
   * API secret. Required only for private (signed) endpoints.
   */
  apiSecret?: string;
  /**
   * Override the REST base URL.
   * @default "https://api.huobi.pro"
   */
  baseUrl?: string;
  /**
   * Request timeout in milliseconds.
   * @default 10000
   */
  timeout?: number;
}
