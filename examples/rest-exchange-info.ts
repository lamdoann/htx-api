import { RestClient } from '../src';

async function main() {
  const client = new RestClient();

  const info = await client.fetchExchangeInfo();
  console.log(`Fetched ${info.symbols.length} symbols at ts=${info.timestamp}`);

  const btc = info.symbols.find((s) => s.symbol === 'btcusdt');
  console.log('btcusdt:', btc);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
