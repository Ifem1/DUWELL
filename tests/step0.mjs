// Step 0 — sanity. Balance every wallet. One contract view read.
import { WALLETS, addressOf, readClient, readView, CONTRACT, RPC, log } from "./lib.mjs";

export default async function step0() {
  const t0 = Date.now();
  log.suite("Step 0 — sanity");
  log.info(`contract=${CONTRACT}  rpc=${RPC}`);

  const ro = readClient();
  for (const label of Object.keys(WALLETS)) {
    const addr = addressOf(label);
    let bal, lastErr;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        bal = await ro.getBalance({ address: addr });
        break;
      } catch (e) {
        lastErr = e;
        log.info(`getBalance ${label} attempt ${attempt}/3: ${e.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    if (bal === undefined) throw new Error(`getBalance failed for ${label} (${addr}): ${lastErr?.message}`);
    if (bal === 0n) {
      throw new Error(`Wallet ${label} (${addr}) has zero balance. Fund it on Studionet faucet before running.`);
    }
    log.info(`${label}  ${addr}  balance=${bal}`);
  }

  // contract view read
  const stats = await readView("get_protocol_stats");
  if (!stats || typeof stats !== "string") {
    throw new Error(`get_protocol_stats returned non-string: ${JSON.stringify(stats)}`);
  }
  log.info(`get_protocol_stats() = ${stats}`);

  log.summary("Step 0", true, Date.now() - t0);
}
