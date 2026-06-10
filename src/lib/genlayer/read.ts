"use client";
import { getReadClient as getClient, contractAddress, isContractConfigured } from "./client";

async function read<T = string>(method: string, args: unknown[] = []): Promise<T | null> {
  if (!isContractConfigured()) return null;
  const client = getClient();
  if (!client) return null;
  const timeout = new Promise<null>((res) => setTimeout(() => res(null), 15000));
  const call = (async () => {
    try {
      // @ts-ignore readContract is provided by genlayer-js
      const out = await client.readContract({
        address: contractAddress(),
        functionName: method,
        args,
      });
      return out as T;
    } catch (e) {
      console.error("[Duwell read]", method, args, e);
      return null;
    }
  })();
  return (await Promise.race([call, timeout])) as T | null;
}

const parse = <T,>(s: string | null, fallback: T): T => {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
};

export const readDisputeIds = async (): Promise<string[]> =>
  parse<string[]>(await read<string>("list_disputes"), []);

export const readLeaseIds = async (): Promise<string[]> =>
  parse<string[]>(await read<string>("list_leases"), []);

export const readDispute = async (id: string) =>
  parse<any | null>(await read<string>("get_dispute", [id]), null);

export const readLease = async (id: string) =>
  parse<any | null>(await read<string>("get_lease", [id]), null);

export const readEvidence = async (id: string) =>
  parse<any[]>(await read<string>("get_dispute_evidence", [id]), []);

export const readLedger = async (id: string) =>
  parse<any[]>(await read<string>("get_deduction_ledger", [id]), []);

export const readTimeline = async (id: string) =>
  parse<any[]>(await read<string>("get_condition_timeline", [id]), []);

export const readReview = async (id: string) =>
  parse<any | null>(await read<string>("get_responsibility_review", [id]), null);

export const readAppeal = async (id: string) =>
  parse<any | null>(await read<string>("get_appeal", [id]), null);

export const readAppealReview = async (id: string) =>
  parse<any | null>(await read<string>("get_appeal_review", [id]), null);

export const readStats = async () =>
  parse<{ leases: number; disputes: number; evidence: number; reviews: number; appeals: number } | null>(
    await read<string>("get_protocol_stats"),
    null,
  );
