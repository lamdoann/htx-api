"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestClient = void 0;
const BaseRestClient_1 = require("./util/BaseRestClient");
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
class RestClient extends BaseRestClient_1.BaseRestClient {
    /**
     * Fetch all supported spot trading symbols and their trading rules.
     *
     * Wraps `GET /v2/settings/common/symbols` and normalises the response into an
     * {@link ExchangeInfo} object (analogous to binance's `exchangeInfo`).
     */
    async fetchExchangeInfo() {
        const response = await this.publicGet('/v2/settings/common/symbols');
        // The v2 endpoint identifies symbols via `sc` (symbol code) and has no
        // `symbol` field. Mirror `sc` into `symbol` so consumers get a stable,
        // binance-like identifier.
        const symbols = (response.data ?? []).map((s) => ({
            ...s,
            symbol: s.symbol ?? s.sc,
        }));
        return {
            symbols,
            timestamp: response.ts ? Number(response.ts) : undefined,
        };
    }
    /**
     * Convenience helper: fetch only the symbols that are currently `online`.
     */
    async fetchOnlineSymbols() {
        const { symbols } = await this.fetchExchangeInfo();
        return symbols.filter((s) => s.state === 'online');
    }
    /**
     * Place a spot order via `POST /v1/order/orders/place`.
     *
     * Requires credentials. Returns the new order id.
     */
    async submitSpotOrder(params) {
        return this.placeOrder(params, 'spot-api');
    }
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
    async submitMarginOrder(params, mode = 'isolated') {
        const source = mode === 'cross' ? 'super-margin-api' : 'margin-api';
        return this.placeOrder(params, source);
    }
    // --- internals ----------------------------------------------------------
    async placeOrder(params, defaultSource) {
        const body = {
            'account-id': String(params.accountId),
            symbol: params.symbol,
            type: params.type,
            amount: String(params.amount),
            source: params.source ?? defaultSource,
        };
        if (params.price !== undefined) {
            body.price = String(params.price);
        }
        if (params.stopPrice !== undefined) {
            body['stop-price'] = String(params.stopPrice);
        }
        if (params.operator !== undefined) {
            body.operator = params.operator;
        }
        if (params.clientOrderId !== undefined) {
            body['client-order-id'] = params.clientOrderId;
        }
        const response = await this.privatePost('/v1/order/orders/place', body);
        return response.data;
    }
}
exports.RestClient = RestClient;
//# sourceMappingURL=rest-client.js.map