# htx-api

Unofficial Node.js / TypeScript SDK for the [HTX (Huobi) Spot](https://www.htx.com/en-us/opend/newApiPages/) API.

Structure is modelled on [tiagosiebler/binance](https://github.com/tiagosiebler/binance): a typed REST client and an event-driven WebSocket client sharing a small `util/` core.

> Current scope: spot `fetchExchangeInfo` (REST) and spot trade streams (WebSocket).

## Install

```bash
npm install htx-api
```

## REST — fetchExchangeInfo

Wraps `GET /v2/settings/common/symbols` and normalises it into an `ExchangeInfo` object.

```ts
import { RestClient } from 'htx-api';

const client = new RestClient();

const info = await client.fetchExchangeInfo();
console.log(info.symbols.length, 'symbols');

// convenience helper
const online = await client.fetchOnlineSymbols();
```

`RestClient` options:

| option    | default                    | description           |
| --------- | -------------------------- | --------------------- |
| `baseUrl` | `https://api.huobi.pro`    | REST base URL         |
| `timeout` | `10000`                    | request timeout (ms)  |

## WebSocket — trade streams

Connects to `wss://api.huobi.pro/ws` and subscribes to `market.<symbol>.trade.detail`.
The client transparently handles HTX's GZIP-compressed frames and `ping`/`pong`
heartbeat, and replays subscriptions on reconnect.

```ts
import { WebsocketClient } from 'htx-api';

const ws = new WebsocketClient();

ws.on('open', () => console.log('connected'));
ws.on('trade', (msg) => {
  for (const t of msg.tick.data) {
    console.log(`${t.direction} ${t.amount} @ ${t.price}`);
  }
});
ws.on('error', (err) => console.error(err));

ws.connect();
ws.subscribeTrades(['btcusdt', 'ethusdt']);

// later
ws.unsubscribeTrades('ethusdt');
ws.close();
```

### Events

| event          | payload                | when                                   |
| -------------- | ---------------------- | -------------------------------------- |
| `open`         | —                      | socket connected                       |
| `trade`        | `TradeDetailMessage`   | a trade-detail push arrived            |
| `response`     | `SubscriptionResponse` | a sub/unsub acknowledgement arrived    |
| `message`      | `unknown`              | any decoded inbound frame (debugging)  |
| `reconnecting` | —                      | a reconnect attempt is starting        |
| `error`        | `Error`                | transport / decode error               |
| `close`        | —                      | socket closed                          |

`WebsocketClient` options:

| option                | default                    | description                       |
| --------------------- | -------------------------- | --------------------------------- |
| `wsUrl`               | `wss://api.huobi.pro/ws`   | market WebSocket URL              |
| `reconnect`           | `true`                     | auto-reconnect on unexpected close|
| `reconnectIntervalMs` | `2000`                     | delay between reconnect attempts  |

## Development

```bash
npm install
npm run build          # compile to dist/
npm run example:rest   # run the REST example
npm run example:ws     # run the WebSocket example
```

## License

MIT
