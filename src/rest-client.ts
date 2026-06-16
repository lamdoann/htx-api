import {
  ExchangeInfo,
  OrderSource,
  SubmitOrderParams,
  SymbolInfo,
} from './types/rest';
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
export class RestClient extends BaseRestClient {
  /**
   * Fetch all supported spot trading symbols and their trading rules.
   *
   * Wraps `GET /v2/settings/common/symbols` and normalises the response into an
   * {@link ExchangeInfo} object (analogous to binance's `exchangeInfo`).
   */
  async fetchExchangeInfo(): Promise<ExchangeInfo> {
    const response = await this.publicGet<SymbolInfo[]>(
      '/v2/settings/common/symbols',
    );

    // The v2 endpoint identifies symbols via `sc` (symbol code) and has no
    // `symbol` field. Mirror `sc` into `symbol` so consumers get a stable,
    // binance-like identifier.
    const symbols = (response.data ?? []).map((s) => ({
      ...s,
      symbol: s.symbol ?? (s.sc as string),
    }));

    return {
      symbols,
      timestamp: response.ts ? Number(response.ts) : undefined,
    };
  }

  /**
   * Convenience helper: fetch only the symbols that are currently `online`.
   */
  async fetchOnlineSymbols(): Promise<SymbolInfo[]> {
    const { symbols } = await this.fetchExchangeInfo();
    return symbols.filter((s) => s.state === 'online');
  }

  /**
   * Place a spot order via `POST /v1/order/orders/place`.
   *
   * Requires credentials. Returns the new order id.
   */
  async submitSpotOrder(params: SubmitOrderParams): Promise<string> {
    return this.placeOrder(params, 'spot-api');
  }

  /**
   * Place a margin order via `POST /v1/order/orders/place`.
   *
   * Defaults `source` to `margin-api` (isolated margin); pass
   * `source: 'super-margin-api'` for cross margin. Requires credentials.
   */
  async submitMarginOrder(params: SubmitOrderParams): Promise<string> {
    return this.placeOrder(params, 'margin-api');
  }

  // --- internals ----------------------------------------------------------

  private async placeOrder(
    params: SubmitOrderParams,
    defaultSource: OrderSource,
  ): Promise<string> {
    const body: Record<string, unknown> = {
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

    const response = await this.privatePost<string>(
      '/v1/order/orders/place',
      body,
    );
    return response.data;
  }
}
