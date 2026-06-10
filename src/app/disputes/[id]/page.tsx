"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  readDispute, readEvidence, readLedger, readTimeline,
  readReview, readLease,
} from "@/lib/genlayer/read";
import { judgeResponsibility, finalizeDispute } from "@/lib/genlayer/write";
import { Dispute, EvidenceItem, DeductionItem, ResponsibilityReview, Lease, TimelineEvent } from "@/types";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { BrassPlateButton, BrassPlateLink } from "@/components/ui/BrassPlateButton";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { LeaseBeam } from "@/components/threshold/LeaseBeam";
import { TwinEvidenceWalls } from "@/components/threshold/TwinEvidenceWalls";
import { DeductionLedger } from "@/components/threshold/DeductionLedger";
import { ConditionTimeline } from "@/components/threshold/ConditionTimeline";
import { SettlementSeal } from "@/components/threshold/SettlementSeal";
import { ConsensusReview } from "@/components/threshold/ConsensusReview";

export default function DisputeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dispute, setDispute] = useState<Dispute | null | undefined>(undefined);
  const [lease, setLease] = useState<Lease | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [ledger, setLedger] = useState<DeductionItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [review, setReview] = useState<ResponsibilityReview | null>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    const d = await readDispute(id);
    setDispute(d ?? null);
    if (d?.leaseId) setLease(await readLease(d.leaseId));
    setEvidence(await readEvidence(id));
    setLedger(await readLedger(id));
    setTimeline(await readTimeline(id));
    setReview(await readReview(id));
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [id]);

  const runConsensus = async () => {
    setRunning(true); setErr(null);
    try {
      await judgeResponsibility(id);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Consensus run failed.");
    } finally { setRunning(false); }
  };

  if (dispute === undefined) return <div className="mx-auto max-w-7xl px-6 py-10">Loading…</div>;
  if (dispute === null) return (
    <div className="mx-auto max-w-7xl px-6 py-10 paper p-8">
      <div className="font-display text-2xl text-clay">Dispute not found.</div>
      <Link href="/disputes" className="brass-outline px-4 py-2 text-xs inline-block mt-4">Back to board</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <SetupNotice />

      <LeaseBeam dispute={dispute} lease={lease} />

      <div className="flex flex-wrap items-center justify-between gap-3 my-6">
        <div className="flex items-center gap-3 [&_.stamp]:!text-[#3A162B] [&_.stamp]:!font-bold">
          <StatusStamp status={dispute.status} />
          <span className="text-xs font-mono text-[#3A162B] font-bold">Filed by {dispute.filedBy}</span>
        </div>
        <div className="flex gap-3">
          <BrassPlateLink href={`/disputes/${id}/evidence`} variant="secondary" className="!bg-[#5D3C64] !text-paper !border-[#5D3C64]">Add Evidence</BrassPlateLink>
          {!review && (
            <BrassPlateButton onClick={runConsensus} disabled={running} icon="⚖">
              {running ? "Reaching consensus…" : "Run GenLayer Review"}
            </BrassPlateButton>
          )}
          {review && dispute.status !== "FINALIZED" && (
            <>
              <BrassPlateLink href={`/disputes/${id}/appeal`} variant="danger" className="!bg-[#5D3C64] !text-white !border-[#5D3C64]">Challenge Outcome</BrassPlateLink>
              <BrassPlateButton onClick={async () => { await finalizeDispute(id); await refresh(); }}>
                Finalize
              </BrassPlateButton>
            </>
          )}
        </div>
      </div>
      {err && <div className="clay-outline px-3 py-2 text-sm mb-4">{err}</div>}

      <TwinEvidenceWalls evidence={evidence} />

      <DeductionLedger ledger={ledger} review={review} />

      <ConditionTimeline events={timeline} />

      <ConsensusReview review={review} status={dispute.status} />

      <section className="mt-10 paper p-6">
        <div className="font-display text-2xl text-paper">Why this needed GenLayer</div>
        <p className="text-sm text-pin/80 mt-3 max-w-3xl">
          A normal smart contract could hold the deposit amount and the lease hash, but
          it cannot read move-in photos against move-out photos, interpret a cleaning
          clause against an invoice, or judge whether a wall mark is wear-and-tear.
          The decision on this file required GenLayer validators to weigh ambiguous,
          natural-language evidence and reach consensus on a structured deposit split.
        </p>
      </section>

      <SettlementSeal review={review} status={dispute.status} />
    </div>
  );
}
