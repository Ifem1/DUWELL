// Shared helpers for Duwell on-chain test suites.
// All writes go through genlayer-js createClient, wait for ACCEPTED, then verify
// receipt.consensus_data.leader_receipt[0].execution_result == "SUCCESS".

import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dir, "..", ".env.local") });
dotenv.config({ path: join(__dir, "..", ".env") });

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// ---------- env loading ----------
function need(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`\nFATAL: missing env var ${name}. Set it in .env.local and re-run.`);
    process.exit(2);
  }
  return v.trim();
}

export const CONTRACT = need("NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS");
export const RPC = need("NEXT_PUBLIC_GENLAYER_RPC_URL");

export const WALLETS = {
  LANDLORD_1: need("LANDLORD_PK_1"),
  LANDLORD_2: need("LANDLORD_PK_2"),
  TENANT_1: need("TENANT_PK_1"),
  TENANT_2: need("TENANT_PK_2"),
};

// ---------- clients ----------
const _cache = new Map();
export function clientFor(label) {
  if (_cache.has(label)) return _cache.get(label);
  const pk = WALLETS[label];
  if (!pk) throw new Error(`Unknown wallet label: ${label}`);
  const account = createAccount(pk);
  const c = createClient({ chain: studionet, endpoint: RPC, account });
  _cache.set(label, c);
  return c;
}
export function addressOf(label) {
  return createAccount(WALLETS[label]).address;
}

// readonly client (uses a freshly-generated key — never touches funded wallets)
let _ro;
export function readClient() {
  if (_ro) return _ro;
  const account = createAccount();
  _ro = createClient({ chain: studionet, endpoint: RPC, account });
  return _ro;
}

// ---------- logging ----------
const COL = { dim: "\x1b[2m", red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", reset: "\x1b[0m" };
export const log = {
  step: (caller, fn, summary) => console.log(`${COL.dim}→${COL.reset} ${caller.padEnd(10)} ${COL.cyan}${fn}${COL.reset}(${summary})`),
  ok: (fn, ms, hash) => console.log(`  ${COL.green}✓${COL.reset} ${fn} ${COL.dim}(${ms}ms) tx=${hash}${COL.reset}`),
  fail: (msg) => console.log(`  ${COL.red}✗ ${msg}${COL.reset}`),
  info: (msg) => console.log(`  ${COL.dim}${msg}${COL.reset}`),
  suite: (name) => console.log(`\n${COL.yellow}━━━ ${name} ━━━${COL.reset}`),
  summary: (name, ok, ms) => console.log(`${COL.dim}SUMMARY:${COL.reset} ${name} — ${ok ? COL.green + "PASS" : COL.red + "FAIL"}${COL.reset} ${COL.dim}(${ms}ms)${COL.reset}`),
};

// ---------- core write with verification + retry ----------
const VALID_OUTCOMES = new Set(["SUCCESS", "ACCEPTED"]);

export async function writeAndVerify(label, fn, args, { expectRevert = false } = {}) {
  const caller = clientFor(label);
  const summary = args.map((a) => {
    const s = typeof a === "string" ? a : JSON.stringify(a);
    return s.length > 28 ? s.slice(0, 25) + "..." : s;
  }).join(", ");
  log.step(label, fn, summary);

  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const t0 = Date.now();
    try {
      const hash = await caller.writeContract({
        address: CONTRACT,
        functionName: fn,
        args,
        value: 0n,
      });
      await caller.waitForTransactionReceipt({ hash, status: "ACCEPTED", retries: 200, interval: 3000 });
      const receipt = await caller.getTransaction({ hash });
      const leader = receipt?.consensus_data?.leader_receipt?.[0];
      const outcome = leader?.execution_result;
      const stderr = leader?.stderr || "";
      const stderrTail = stderr.split("\n").filter(Boolean).slice(-2).join(" | ");

      if (expectRevert) {
        if (!VALID_OUTCOMES.has(outcome)) {
          log.ok(`${fn} (reverted as expected)`, Date.now() - t0, hash);
          return { hash, receipt, leader, outcome, stderrTail };
        }
        throw new Error(`Expected revert but tx succeeded. hash=${hash}`);
      }

      if (!VALID_OUTCOMES.has(outcome)) {
        throw new Error(`${fn} on-chain failure: outcome=${outcome} hash=${hash} stderr_tail="${stderrTail}"`);
      }
      log.ok(fn, Date.now() - t0, hash);
      return { hash, receipt, leader, outcome, stderrTail };
    } catch (e) {
      lastErr = e;
      const msg = e?.message || String(e);
      if (expectRevert && /reverted|VmUserError|on-chain failure/i.test(msg)) {
        log.ok(`${fn} (reverted)`, Date.now() - t0, "n/a");
        return { hash: null, outcome: "FAIL", stderrTail: msg };
      }
      log.info(`attempt ${attempt}/3 failed: ${msg}`);
      if (attempt < 3) await sleep(5000);
    }
  }
  throw lastErr;
}

// ---------- view reads ----------
export async function readView(fn, args = []) {
  const c = readClient();
  return await c.readContract({ address: CONTRACT, functionName: fn, args });
}

export async function readJson(fn, args = [], fallback = null) {
  const raw = await readView(fn, args);
  if (!raw || typeof raw !== "string") return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

// ---------- misc ----------
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT failed: ${msg}`);
}
export function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`ASSERT ${msg}: expected ${e}, got ${a}`);
}
export function assertIn(value, set, msg) {
  if (!set.includes(value)) throw new Error(`ASSERT ${msg}: ${value} not in [${set.join(", ")}]`);
}

export function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}
