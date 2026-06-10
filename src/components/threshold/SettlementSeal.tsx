import { ResponsibilityReview } from "@/types";

export function SettlementSeal({
  review, status,
}: { review: ResponsibilityReview | null; status: string }) {
  if (!review) {
    return (
      <section className="mt-6 paper p-6 text-center">
        <div className="stamp text-pin/70">AWAITING CONSENSUS REVIEW</div>
        <p className="text-sm text-pin/70 mt-2">
          Settlement Seal appears after a GenLayer review has been stored on-chain.
        </p>
      </section>
    );
  }
  return (
    <section className="mt-8 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 paper p-8 border-2 border-brass">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-brass">Settlement Seal</div>
        <div className="font-display text-3xl text-paper mt-1">{review.decision.replace(/_/g, " ")}</div>
        <div className="grid grid-cols-2 gap-4 mt-5 font-mono text-sm">
          <Cell label="Tenant refund" value={`${review.tenant_refund_percent}%`} sub={`${review.currency} ${review.tenant_refund_amount}`} />
          <Cell label="Landlord retains" value={`${review.landlord_retained_percent}%`} sub={`${review.currency} ${review.landlord_retained_amount}`} />
          <Cell label="Responsibility" value={review.overall_responsibility} />
          <Cell label="Confidence" value={`${review.confidence}`} sub="out of 100" />
        </div>
      </div>
      <div className="self-center text-center">
        <div className="border-4 border-double border-brass rounded-full w-40 h-40 flex flex-col items-center justify-center bg-paper/60">
          <div className="font-display text-xs tracking-[0.3em] text-brass">DUWELL</div>
          <div className="font-display text-2xl text-paper leading-tight uppercase">
            {review.decision === "FULL_TENANT_REFUND" ? "Refund" :
             review.decision === "LANDLORD_RETAINS_FULL_DEPOSIT" ? "Retain" :
             review.decision === "ESCALATE" ? "Escalate" :
             review.decision === "NEEDS_MORE_EVIDENCE" ? "Pending" : "Split"}
          </div>
          <div className="text-[10px] tracking-[0.3em] text-pin/80 mt-1">{status.replace(/_/g, " ")}</div>
        </div>
      </div>
    </section>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.25em] text-pin/70">{label}</div>
      <div className="font-display text-2xl text-paper">{value}</div>
      {sub && <div className="text-xs text-pin/70">{sub}</div>}
    </div>
  );
}
