export { RestClient } from './rest-client';
export {
  WebsocketClient,
  tradeTopic,
  klineTopic,
  ordersChannel,
  DEFAULT_WS_URL,
  DEFAULT_ACCOUNT_WS_URL,
} from './websocket-client';

export {
  BaseRestClient,
  HtxApiError,
  DEFAULT_REST_BASE_URL,
} from './util/BaseRestClient';
export {
  signHmacSha256,
  htxTimestamp,
  buildSignedRestParams,
  buildWsAuthParams,
} from './util/auth';
export { DefaultLogger } from './util/logger';
export type { Logger } from './util/logger';

export type {
  HtxRestResponse,
  RestClientOptions,
} from './types/shared';
export type {
  ExchangeInfo,
  SymbolInfo,
  SymbolState,
  OrderType,
  OrderSource,
  MarginMode,
  SubmitOrderParams,
} from './types/rest';
export type {
  TradeDetail,
  TradeDetailTick,
  TradeDetailMessage,
  Kline,
  KlineInterval,
  KlineMessage,
  OrderUpdate,
  OrderUpdateMessage,
  SubscriptionResponse,
  WebsocketClientOptions,
  WebsocketClientEvents,
} from './types/websocket';
