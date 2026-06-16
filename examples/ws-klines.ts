import { WebsocketClient } from '../src';

const ws = new WebsocketClient();

ws.on('open', () => console.log('connected'));
ws.on('response', (res) => console.log('ack:', res.subbed ?? res.unsubbed));
ws.on('trade', (msg) => {
  const t = msg.tick.data[0];
  console.log(`TRADE ${msg.ch} ${t.direction} ${t.amount} @ ${t.price}`);
});
ws.on('kline', (msg) => {
  const k = msg.tick;
  console.log(`KLINE ${msg.ch} O=${k.open} H=${k.high} L=${k.low} C=${k.close}`);
});
ws.on('error', (err) => console.error('ws error:', err.message));

ws.connect();
ws.subscribeTrades('btcusdt');
ws.subscribeKlines('btcusdt', '1min');

setTimeout(() => ws.terminate(), 15_000);
