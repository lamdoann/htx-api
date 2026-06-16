import { ExchangeInfo, SymbolInfo } from './types/rest';
import { BaseRestClient } from './util/BaseRestClient';
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
}
//# sourceMappingURL=rest-client.d.ts.map