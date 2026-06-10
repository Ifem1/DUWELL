import { ResponsibilityReview } from "@/types";

export function ConsensusReview({
  review, status,
}: { review: ResponsibilityReview | null; status: string }) {
  return (
    <section className="paper p-6 mt-6">
      <div className="text-xs uppercase tracking-[0.25em] text-brass">Consensus Review</div>
      <div className="font-display text-2xl text-paper mb-4">GenLayer validators</div>

      {!review ? (
        <div className="text-sm text-pin/80 italic">
          {status === "UNDER_CONSENSUS_REVIEW"
            ? "Validators are reaching consensus…"
            : "This dispute has not been reviewed by GenLayer consensus yet."}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          <Kv k="Decision" v={review.decision.replace(/_/g, " ")} />
          <Kv k="Overall responsibility" v={review.overall_responsibility} />
          <Kv k="Confidence" v={`${review.confidence}%`} />
          <Kv k="Risk level" v={review.risk_level} />
          <Kv k="Tenant refund" v={`${review.currency} ${review.tenant_refund_amount} (${review.tenant_refund_percent}%)`} />
          <Kv k="Landlord retained" v={`${review.currency} ${review.landlord_retained_amount} (${review.landlord_retained_percent}%)`} />
          <List title="Lease findings" items={review.lease_findings} />
          <List title="Evidence findings" items={review.evidence_findings} />
          <List title="Red flags" items={review.red_flags} tone="clay" />
          <List title="Missing information" items={review.missing_information} tone="pin" />
          <div className="lg:col-span-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-pin/70">Reasoning summary</div>
            <p className="text-sm text-paper mt-1">{review.reasoning_summary}</p>
            <div className="text-[10px] uppercase tracking-[0.2em] text-pin/70 mt-4">Recommended action</div>
            <p className="text-sm text-paper mt-1">{review.recommended_action}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-pin/70">{k}</div>
      <div className="font-mono text-base text-paper">{v}</div>
    </div>
  );
}
function List({ title, items, tone }: { title: string; items: string[]; tone?: "clay" | "pin" }) {
  if (!items?.length) return null;
  const c = tone === "clay" ? "text-clay" : tone === "pin" ? "text-pin" : "text-pin/80";
  return (
    <div>
      <div className={`text-[10px] uppercase tracking-[0.2em] ${c}`}>{title}</div>
      <ul className="list-disc list-inside text-sm text-paper mt-1 space-y-1">
        {items.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
    </div>
  );
}
