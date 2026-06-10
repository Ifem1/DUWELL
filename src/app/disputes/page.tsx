"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readDisputeIds, readDispute } from "@/lib/genlayer/read";
import { Dispute, DisputeStatus, DisputeType } from "@/types";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { BrassPlateLink } from "@/components/ui/BrassPlateButton";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { isContractConfigured } from "@/lib/genlayer/config";

const STATUSES: DisputeStatus[] = [
  "DRAFT","FILED","EVIDENCE_PENDING","UNDER_CONSENSUS_REVIEW",
  "FULL_TENANT_REFUND","PARTIAL_TENANT_REFUND","LANDLORD_RETAINS_FULL_DEPOSIT",
  "NEEDS_MORE_EVIDENCE","ESCALATED","APPEALED","FINALIZED",
];

export default function DisputesPage() {
  const [items, setItems] = useState<Dispute[] | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    if (!isContractConfigured()) { setItems([]); return; }
    (async () => {
      const ids = await readDisputeIds();
      const docs = await Promise.all(ids.map((id) => readDispute(id)));
      setItems(docs.filter(Boolean) as Dispute[]);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((d) =>
      (!statusFilter || d.status === statusFilter) &&
      (!typeFilter || d.disputeType === typeFilter),
    );
  }, [items, statusFilter, typeFilter]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <SetupNotice />

      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[#7B466A] font-bold">Building Directory</div>
          <h1 className="font-display text-4xl text-paper">Dispute Board</h1>
          <p className="text-pin/80 text-sm mt-1">Every Threshold File on Duwell. Real submissions only.</p>
        </div>
        <BrassPlateLink href="/open-dispute" icon="+">Open a Dispute File</BrassPlateLink>
      </div>

      {/* Filter rail */}
      <div className="paper p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="min-w-[200px]">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div className="min-w-[200px]">
          <label>Dispute Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All</option>
            {["DAMAGE_DEDUCTION","CLEANING_FEE","UNPAID_RENT_DEDUCTION","UTILITY_DEDUCTION","MISSING_ITEM","APPLIANCE_DAMAGE","FURNITURE_DAMAGE","WALL_OR_PAINT_DAMAGE","WEAR_AND_TEAR","SHARED_TENANCY_SPLIT","FULL_DEPOSIT_WITHHELD","OTHER"].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {items === null ? (
        <div className="paper p-8">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="paper p-10 text-center">
          <div className="font-display text-2xl text-paper">No dispute files yet.</div>
          <p className="text-sm text-pin/80 mt-1">
            Open the first Threshold File to begin deposit review.
          </p>
          <div className="mt-5 inline-block">
            <BrassPlateLink href="/open-dispute" icon="+">Open a Dispute File</BrassPlateLink>
          </div>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 [&>*]:mb-4">
          {filtered.map((d, i) => (
            <UnitPlaqueCard key={d.id} d={d} index={i + 101} />
          ))}
        </div>
      )}
    </div>
  );
}

function UnitPlaqueCard({ d, index }: { d: Dispute; index: number }) {
  return (
    <div className="paper p-5 break-inside-avoid relative">
      <div className="absolute -top-3 left-4 brass-plate text-[10px] px-2 py-1 rounded-sm font-mono">
        UNIT {index}
      </div>
      <div className="flex justify-between items-start mt-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-pin/70 font-mono">
            #{d.id.slice(0, 14)}
          </div>
          <div className="font-display text-xl text-paper mt-1">
            {(d.disputeType as DisputeType).replace(/_/g, " ")}
          </div>
        </div>
        <StatusStamp status={d.status} />
      </div>
      <p className="text-sm text-pin/80 mt-3 line-clamp-3">{d.summary}</p>
      <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] font-mono text-pin/90">
        <div>
          <div className="text-[9px] uppercase tracking-widest text-pin/60">Deposit</div>
          {d.currency} {d.depositAmount}
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-widest text-pin/60">Disputed</div>
          {d.currency} {d.amountDisputed}
        </div>
        <div className="col-span-2 truncate">
          <div className="text-[9px] uppercase tracking-widest text-pin/60">Property</div>
          {d.propertyType}
        </div>
      </div>
      <div className="mt-5 flex justify-end">
        <Link href={`/disputes/${d.id}`} className="brass-plate text-[10px] px-3 py-2">
          Enter File →
        </Link>
      </div>
    </div>
  );
}
