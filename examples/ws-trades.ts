import { RestClient, WebsocketClient } from "../src";

async function main() {
  const client = new RestClient();

  const info = await client.fetchExchangeInfo();
  console.log(`Exchange info fetched at ts=${info.timestamp}`, info);
  const symbols = info.symbols
    .filter((s) => s.qc === "usdt" && s.state === "online")
    .map((s) => s.symbol);
  console.log(`Fetched ${symbols.length} symbols at ts=${info.timestamp}`);

  const ws = new WebsocketClient();

  ws.on("open", () => console.log("connected"));
  ws.on("response", (res) =>
    console.log("sub ack:", res.subbed ?? res.unsubbed),
  );
  ws.on("trade", (msg) => {
    for (const t of msg.tick.data) {
      console.log(
        `${msg.ch} | ${t.direction.toUpperCase()} ${t.amount} @ ${t.price}`,
      );
    }
  });
  ws.on("error", (err) => console.error("ws error:", err.message));
  ws.on("close", () => console.log("closed"));

  ws.connect();
  ws.subscribeTrades(symbols);
}

main().catch((err) => console.error(err));
