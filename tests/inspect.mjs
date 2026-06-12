import { clientFor, readView } from "./lib.mjs";

const c = clientFor("TENANT_1");

// list everything, take the last few
const raw = await readView("list_disputes");
const ids = JSON.parse(raw);
const last = ids.slice(-5);
console.log(`disputes on-chain: ${ids.length}, last 5:`, last);

for (const id of last) {
  const d = JSON.parse(await readView("get_dispute", [id]));
  const rv = await readView("get_responsibility_review", [id]);
  console.log(`\n${id}  status=${d.status}  review=${rv ? "YES (" + rv.length + " bytes)" : "no"}`);
}

const hashes = [
  "0xd9a8524d5a7b19fd5d0b2034db0215aef660b72505a7e9a9d2d4b185c8595454",
  "0x3b0e1e909a5b1da2f3b8cd179d8581138681b10980d18fd9ed48134b4bf772c6",
];
for (const h of hashes) {
  const tx = await c.getTransaction({ hash: h });
  const lr = tx?.consensus_data?.leader_receipt?.[0];
  console.log(`\nTX ${h}`);
  console.log(`  execution_result: ${lr?.execution_result}`);
  console.log(`  function: ${tx?.data?.function_name || tx?.tx_data?.function_name}`);
  console.log(`  args:`, JSON.stringify(tx?.data?.args || tx?.tx_data?.args).slice(0, 120));
  const stderr = (lr?.stderr || "").split("\n").filter(Boolean);
  if (stderr.length) console.log(`  stderr tail:\n    ${stderr.slice(-6).join("\n    ")}`);
  const stdout = (lr?.stdout || "").slice(0, 400);
  if (stdout) console.log(`  stdout head: ${stdout}`);
}
