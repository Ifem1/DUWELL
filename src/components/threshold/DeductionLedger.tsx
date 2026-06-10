import { DeductionItem, ResponsibilityReview } from "@/types";
import Link from "next/link";
import { useParams } from "next/navigation";

export function DeductionLedger({
  ledger, review,
}: { ledger: DeductionItem[]; review: ResponsibilityReview | null }) {
  const { id } = useParams<{ id: string }>();
  const resultBy = new Map(review?.deduction_results?.map((r) => [r.deduction_id, r]) ?? []);

  return (
    <section className="paper p-6 mt-6">
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-brass">Deduction Ledger</div>
          <div className="font-display text-2xl text-paper">Each disputed line</div>
        </div>
        <Link href={`/disputes/${id}/evidence`} className="brass-outline px-3 py-2 text-xs">Edit Ledger / Evidence</Link>
      </div>

      {ledger.length === 0 ? (
        <div className="text-sm text-pin/70 italic">No deductions added yet.</div>
      ) : (
        <div className="ledger-line">
          <div className="grid grid-cols-[1fr_120px_110px_180px] gap-3 text-[10px] uppercase tracking-[0.2em] text-pin/60 pb-2 border-b border-ledger/50">
            <div>Item</div><div>Claimed</div><div>Approved</div><div>Responsibility</div>
          </div>
          {ledger.map((d) => {
            const r = resultBy.get(d.id);
            return (
              <div key={d.id} className="grid grid-cols-[1fr_120px_110px_180px] gap-3 py-3 border-b border-ledger/30 items-start">
                <div>
                  <div className="font-display text-base text-paper">{d.category.replace(/_/g, " ")}</div>
                  <div className="text-xs text-pin/80 mt-1">{d.description}</div>
                  {r && <div className="text-xs text-pin/70 mt-1 italic">{r.reason}</div>}
                </div>
                <div className="font-mono text-sm">{d.currency} {d.claimedAmount}</div>
                <div className="font-mono text-sm">
                  {r ? `${d.currency} ${r.approved_amount}` : <span className="text-pin/40">—</span>}
                </div>
                <Compass active={r?.responsibility} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Compass({ active }: { active?: string }) {
  const labels = ["TENANT", "SHARED", "LANDLORD", "UNCLEAR"];
  return (
    <div className="grid grid-cols-4 gap-1 text-[9px] uppercase tracking-widest font-mono">
      {labels.map((l) => (
        <div
          key={l}
          className={`px-1 py-1 text-center border ${
            active === l ? "brass-plate !text-paper border-ledger" : "border-ledger/50 text-pin/80/50"
          }`}
        >
          {l[0]}
        </div>
      ))}
    </div>
  );
}
