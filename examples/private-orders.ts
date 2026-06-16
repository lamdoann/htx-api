import { RestClient, WebsocketClient } from '../src';

// Requires real credentials with trade permission.
const apiKey = process.env.HTX_API_KEY ?? '';
const apiSecret = process.env.HTX_API_SECRET ?? '';
const accountId = process.env.HTX_ACCOUNT_ID ?? '';

async function main() {
  // --- private WebSocket: live order updates ---
  const ws = new WebsocketClient({ apiKey, apiSecret });
  ws.on('authenticated', () => console.log('ws authenticated'));
  ws.on('order', (msg) => console.log('order update:', msg.data));
  ws.on('error', (err) => console.error('ws error:', err.message));
  ws.subscribeOrders('btcusdt'); // omit arg for all symbols (orders#*)

  // --- private REST: place a (tiny) limit order ---
  const rest = new RestClient({ apiKey, apiSecret });
  const orderId = await rest.submitSpotOrder({
    accountId,
    symbol: 'btcusdt',
    type: 'buy-limit',
    amount: '0.0001',
    price: '20000', // far from market so it rests on the book
  });
  console.log('placed spot order id:', orderId);

  setTimeout(() => ws.close(), 20_000);
}

main().catch((err) => console.error(err));
