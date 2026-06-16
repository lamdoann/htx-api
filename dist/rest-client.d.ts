import { ExchangeInfo, MarginMode, SubmitOrderParams, SymbolInfo } from './types/rest';
import { BaseRestClient } from './util/BaseRestClient';
/**
 * HTX (Huobi) Spot REST client.
 *
 * Public market metadata works without credentials; order placement and any
 * other private endpoints require `apiKey`/`apiSecret` in the constructor
 * options. Structured after the binance SDK so additional endpoints can be added
 * incrementally.
 *
 * @example
 * ```ts
 * const client = new RestClient({ apiKey: '...', apiSecret: '...' });
 * const info = await client.fetchExchangeInfo();
 * const orderId = await client.submitSpotOrder({
 *   accountId: 123,
 *   symbol: 'btcusdt',
 *   type: 'buy-limit',
 *   amount: '0.001',
 *   price: '50000',
 * });
 * ```
 */
export declare class RestClient extends BaseRestClient {
    /**
     * Fetch all supported spot trading symbols and their trading rules.
     *
     * Wraps `GET /v2/settings/common/symbols` and normalises the response into an
     * {@link ExchangeInfo} object (analogous to binance's `exchangeInfo`).
     */
    fetchExchangeInfo(): Promise<ExchangeInfo>;
    /**
     * Convenience helper: fetch only the symbols that are currently `online`.
     */
    fetchOnlineSymbols(): Promise<SymbolInfo[]>;
    /**
     * Place a spot order via `POST /v1/order/orders/place`.
     *
     * Requires credentials. Returns the new order id.
     */
    submitSpotOrder(params: SubmitOrderParams): Promise<string>;
    /**
     * Place a margin order via `POST /v1/order/orders/place`.
     *
     * `mode` selects the margin account and is mapped to the HTX `source` field:
     * `isolated` → `margin-api`, `cross` → `super-margin-api`. Defaults to
     * `isolated`. An explicit `params.source` still takes precedence. Requires
     * credentials.
     *
     * @example
     * ```ts
     * await client.submitMarginOrder({ accountId, symbol: 'btcusdt', type: 'buy-limit', amount: '0.001', price: '50000' });          // isolated
     * await client.submitMarginOrder({ accountId, symbol: 'btcusdt', type: 'buy-limit', amount: '0.001', price: '50000' }, 'cross'); // cross
     * ```
     */
    submitMarginOrder(params: SubmitOrderParams, mode?: MarginMode): Promise<string>;
    private placeOrder;
}
//# sourceMappingURL=rest-client.d.ts.map