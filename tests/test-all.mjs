// Orchestrator. Runs suites in order: Step 0 → det-happy → det-revert → nondet.
// Stops on first failure. Filter with: node tests/test-all.mjs <name> [<name>...]
import step0 from "./step0.mjs";
import detHappy from "./det-happy.mjs";
import detRevert from "./det-revert.mjs";
import nondet from "./nondet.mjs";

const SUITES = [
  { name: "step0", fn: step0 },
  { name: "det-happy", fn: detHappy },
  { name: "det-revert", fn: detRevert },
  { name: "nondet", fn: nondet },
];

const filter = process.argv.slice(2);
const toRun = filter.length ? SUITES.filter((s) => filter.includes(s.name)) : SUITES;

const results = [];
for (const s of toRun) {
  const t0 = Date.now();
  try {
    await s.fn();
    results.push({ name: s.name, ok: true, ms: Date.now() - t0 });
  } catch (e) {
    results.push({ name: s.name, ok: false, ms: Date.now() - t0, err: e.message });
    console.error(`\n✗ Suite ${s.name} FAILED: ${e.message}`);
    if (e.stack) console.error(e.stack.split("\n").slice(1, 6).join("\n"));
    break;
  }
}

console.log("\n=== FINAL SUMMARY ===");
for (const r of results) {
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(12)} ${r.ms}ms${r.err ? "  " + r.err : ""}`);
}
const failed = results.some((r) => !r.ok);
process.exit(failed ? 1 : 0);
