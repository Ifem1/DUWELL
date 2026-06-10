"use client";
import { isContractConfigured } from "@/lib/genlayer/config";

export function SetupNotice() {
  if (isContractConfigured()) return null;
  return (
    <div className="paper px-5 py-4 mb-6">
      <div className="font-display text-lg text-clay">GenLayer contract is not configured yet.</div>
      <p className="text-sm text-pin/80 mt-1">
        Deploy Duwell and add{" "}
        <span className="font-mono">NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS</span> to enable live disputes.
      </p>
    </div>
  );
}
