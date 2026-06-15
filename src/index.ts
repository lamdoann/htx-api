export { RestClient } from './rest-client';
export {
  WebsocketClient,
  tradeTopic,
  DEFAULT_WS_URL,
} from './websocket-client';

export {
  BaseRestClient,
  HtxApiError,
  DEFAULT_REST_BASE_URL,
} from './util/BaseRestClient';
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
} from './types/rest';
export type {
  TradeDetail,
  TradeDetailTick,
  TradeDetailMessage,
  SubscriptionResponse,
  WebsocketClientOptions,
  WebsocketClientEvents,
} from './types/websocket';
