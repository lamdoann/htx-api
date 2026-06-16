"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestClient = void 0;
const BaseRestClient_1 = require("./util/BaseRestClient");
/**
 * HTX (Huobi) Spot public REST client.
 *
 * Scope is intentionally limited to the public market-metadata endpoints needed
 * today; the {@link BaseRestClient} base is structured so authenticated/private
 * endpoints can be layered on later, following the binance SDK pattern.
 *
 * @example
 * ```ts
 * const client = new RestClient();
 * const info = await client.fetchExchangeInfo();
 * console.log(info.symbols.length);
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
        const response = await this.get('/v2/settings/common/symbols');
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
}
exports.RestClient = RestClient;
//# sourceMappingURL=rest-client.js.map