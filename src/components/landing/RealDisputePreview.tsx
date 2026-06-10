"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { readDisputeIds, readDispute } from "@/lib/genlayer/read";
import { Dispute } from "@/types";
import { StatusStamp } from "@/components/ui/StatusStamp";
import { isContractConfigured } from "@/lib/genlayer/config";

export function RealDisputePreview() {
  const [items, setItems] = useState<Dispute[] | null>(null);

  useEffect(() => {
    if (!isContractConfigured()) { setItems([]); return; }
    (async () => {
      const ids = await readDisputeIds();
      const recent = ids.slice(-3).reverse();
      const docs = await Promise.all(recent.map((id) => readDispute(id)));
      setItems(docs.filter(Boolean) as Dispute[]);
    })();
  }, []);

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-[#3A162B] font-bold">Recent Dispute Files</div>
          <h3 className="font-display text-2xl text-paper">From real user submissions only</h3>
        </div>
        <Link href="/disputes" className="brass-outline px-4 py-2 text-xs !text-[#7B466A] !border-[#7B466A]">View Dispute Board</Link>
      </div>

      {items === null ? (
        <div className="paper p-8 text-sm text-pin/80">Loading…</div>
      ) : items.length === 0 ? (
        <div className="paper p-8">
          <div className="font-display text-xl text-paper">No dispute files yet.</div>
          <p className="text-sm text-pin/80 mt-1">
            Open the first Threshold File to begin deposit review.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((d) => (
            <Link key={d.id} href={`/disputes/${d.id}`} className="paper p-5 hover:shadow-plaque transition">
              <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-pin/70">
                <span className="font-mono">#{d.id.slice(0, 10)}</span>
                <StatusStamp status={d.status} />
              </div>
              <div className="font-display text-lg text-paper mt-3">{d.disputeType.replace(/_/g, " ")}</div>
              <p className="text-sm text-pin/80 mt-1 line-clamp-3">{d.summary}</p>
              <div className="text-xs font-mono text-pin/80 mt-3">
                Deposit {d.currency} {d.depositAmount} · Disputed {d.currency} {d.amountDisputed}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
