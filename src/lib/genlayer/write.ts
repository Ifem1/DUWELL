"use client";
import { getWriteClient, contractAddress, isContractConfigured } from "./client";

async function write(method: string, args: unknown[]): Promise<string> {
  if (!isContractConfigured()) {
    throw new Error("Contract not configured. Set NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS.");
  }
  const client = getWriteClient();
  if (!client) throw new Error("Connect your wallet to submit on-chain transactions.");
  // @ts-expect-error writeContract provided by genlayer-js
  const tx = await client.writeContract({
    address: contractAddress(),
    functionName: method,
    args,
    value: 0n,
  });
  const hash = typeof tx === "string" ? tx : (tx?.hash ?? "");
  try {
    // @ts-expect-error waitForTransactionReceipt provided by genlayer-js
    await client.waitForTransactionReceipt?.({ hash, status: "ACCEPTED", retries: 120, interval: 2000 });
  } catch (e: any) {
    // ACCEPTED is enough for state reads; finalisation can take much longer.
    if (!/timed out/i.test(e?.message || "")) throw e;
  }
  return hash;
}

export const createLease = (id: string, lease: unknown) =>
  write("create_lease", [id, JSON.stringify(lease)]);
export const openDispute = (id: string, leaseId: string, dispute: unknown) =>
  write("open_dispute", [id, leaseId, JSON.stringify(dispute)]);
export const addEvidence = (eid: string, did: string, ev: unknown) =>
  write("add_evidence", [eid, did, JSON.stringify(ev)]);
export const setDeductionLedger = (did: string, ledger: unknown) =>
  write("set_deduction_ledger", [did, JSON.stringify(ledger)]);
export const setConditionTimeline = (did: string, timeline: unknown) =>
  write("set_condition_timeline", [did, JSON.stringify(timeline)]);
export const openAppeal = (aid: string, did: string, appeal: unknown) =>
  write("open_appeal", [aid, did, JSON.stringify(appeal)]);
export const finalizeDispute = (did: string) => write("finalize_dispute", [did]);

export const judgeResponsibility = (did: string) => write("judge_responsibility", [did]);
export const reviewAppeal = (aid: string) => write("review_appeal", [aid]);
export const detectConflicts = (did: string) => write("detect_evidence_conflicts", [did]);
