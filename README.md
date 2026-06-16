# htx-api

Unofficial Node.js / TypeScript SDK for the [HTX (Huobi) Spot](https://www.htx.com/en-us/opend/newApiPages/) API.

## Install

```bash
npm install htx-api
```

## REST

```ts
import { RestClient } from 'htx-api';

// public endpoints need no credentials; private (signed) ones do
const client = new RestClient({ apiKey: '...', apiSecret: '...' });
```

`RestClient` options:

| option      | default                    | description                          |
| ----------- | -------------------------- | ------------------------------------ |
| `apiKey`    | —                          | required for private endpoints       |
| `apiSecret` | —                          | required for private endpoints       |
| `baseUrl`   | `https://api.huobi.pro`    | REST base URL                        |
| `timeout`   | `10000`                    | request timeout (ms)                 |

### fetchExchangeInfo

Wraps `GET /v2/settings/common/symbols` and normalises it into an `ExchangeInfo` object.

```ts
const info = await client.fetchExchangeInfo();
console.log(info.symbols.length, 'symbols');

const online = await client.fetchOnlineSymbols(); // convenience helper
```

### Generic requests

Call any endpoint directly; signing and the response envelope are handled for you.

```ts
await client.publicGet('/market/tickers');
await client.privateGet('/v1/account/accounts');
await client.privatePost('/v1/order/orders/place', { /* body */ });
```

### Placing orders

`submitSpotOrder` / `submitMarginOrder` wrap `POST /v1/order/orders/place`
(camelCase params are mapped to HTX's kebab-case fields). They return the order id.

```ts
const spotId = await client.submitSpotOrder({
  accountId: 123,           // from GET /v1/account/accounts
  symbol: 'btcusdt',
  type: 'buy-limit',        // buy/sell + market/limit/ioc/limit-maker/...
  amount: '0.001',
  price: '50000',
});

// margin: second arg selects the account mode (default 'isolated')
//   'isolated' -> source 'margin-api', 'cross' -> source 'super-margin-api'
const isolatedId = await client.submitMarginOrder({
  accountId: 456,
  symbol: 'btcusdt',
  type: 'sell-limit',
  amount: '0.001',
  price: '70000',
});

const crossId = await client.submitMarginOrder(
  { accountId: 456, symbol: 'btcusdt', type: 'sell-limit', amount: '0.001', price: '70000' },
  'cross',
);
```

## WebSocket

A single `WebsocketClient` manages two underlying sockets, created lazily:

- **market** (`wss://api.huobi.pro/ws`) — public trade & kline streams. GZIP
  frames, `{"ping":n}` → `{"pong":n}` heartbeat.
- **account** (`wss://api.huobi.pro/ws/v2`) — private order updates. Plain-JSON
  frames, `{"action":"ping"}` → `{"action":"pong"}` heartbeat, requires
  `apiKey`/`apiSecret` (auth happens automatically on first private subscribe).

Subscriptions are remembered and replayed on reconnect.

### Public streams (trades & klines)

```ts
import { WebsocketClient } from 'htx-api';

const ws = new WebsocketClient();

ws.on('trade', (msg) => {
  for (const t of msg.tick.data) {
    console.log(`${t.direction} ${t.amount} @ ${t.price}`);
  }
});
ws.on('kline', (msg) => console.log(msg.ch, msg.tick.close));
ws.on('error', (err) => console.error(err));

ws.subscribeTrades(['btcusdt', 'ethusdt']);
ws.subscribeKlines('btcusdt', '1min');

// later
ws.unsubscribeTrades('ethusdt');
ws.unsubscribeKlines('btcusdt', '1min');
ws.close();      // graceful close
// ws.terminate();  // force-close immediately
```

### Private order stream

```ts
const ws = new WebsocketClient({ apiKey: '...', apiSecret: '...' });

ws.on('authenticated', () => console.log('authed'));
ws.on('order', (msg) => console.log('order update:', msg.data));

ws.subscribeOrders('btcusdt'); // omit the arg to subscribe to all symbols (orders#*)
// ws.unsubscribeOrders('btcusdt');
```

### Methods

| method                              | channel                              |
| ----------------------------------- | ------------------------------------ |
| `connect()`                         | open the public market socket        |
| `subscribeTrades(symbols)`          | `market.<symbol>.trade.detail`       |
| `unsubscribeTrades(symbols)`        | —                                    |
| `subscribeKlines(symbols, interval)`| `market.<symbol>.kline.<interval>`   |
| `unsubscribeKlines(symbols, interval)` | —                                 |
| `subscribeOrders(symbols?)`         | `orders#<symbol>` (private)          |
| `unsubscribeOrders(symbols?)`       | —                                    |
| `close()`                           | graceful close of all sockets        |
| `terminate()`                       | force-close all sockets immediately  |

Kline intervals: `1min`, `5min`, `15min`, `30min`, `60min`, `4hour`, `1day`,
`1mon`, `1week`, `1year`.

### Events

| event           | payload                | when                                  |
| --------------- | ---------------------- | ------------------------------------- |
| `open`          | —                      | market socket connected               |
| `authenticated` | —                      | private socket authenticated          |
| `trade`         | `TradeDetailMessage`   | a trade-detail push arrived           |
| `kline`         | `KlineMessage`         | a kline push arrived                  |
| `order`         | `OrderUpdateMessage`   | a private order update arrived        |
| `response`      | `SubscriptionResponse` | a sub/unsub acknowledgement arrived   |
| `message`       | `unknown`              | any decoded inbound frame (debugging) |
| `reconnecting`  | —                      | a reconnect attempt is starting       |
| `error`         | `Error`                | transport / decode / auth error       |
| `close`         | —                      | a socket closed                       |

`WebsocketClient` options:

| option                | default                       | description                        |
| --------------------- | ----------------------------- | ---------------------------------- |
| `apiKey`              | —                             | required for private channels      |
| `apiSecret`           | —                             | required for private channels      |
| `wsUrl`               | `wss://api.huobi.pro/ws`      | public market WebSocket URL        |
| `accountWsUrl`        | `wss://api.huobi.pro/ws/v2`   | private account WebSocket URL      |
| `reconnect`           | `true`                        | auto-reconnect on unexpected close |
| `reconnectIntervalMs` | `2000`                        | delay between reconnect attempts   |

## Development

```bash
npm install
npm run build          # compile to dist/
npm run example:rest   # run the REST example
npm run example:ws     # run the WebSocket example
npm test               # run unit tests (offline, no API keys needed)
```

Tests use Node's built-in test runner and cover the request-signing logic
(`util/auth.ts`) with golden signature vectors — no network or credentials
required.

## License

MIT
