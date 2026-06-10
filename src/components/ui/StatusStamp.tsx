import { DisputeStatus } from "@/types";

const COLOR: Record<string, string> = {
  DRAFT: "text-pin/80",
  FILED: "text-tenant",
  EVIDENCE_PENDING: "text-pin",
  UNDER_CONSENSUS_REVIEW: "text-brass",
  FULL_TENANT_REFUND: "text-inspection",
  PARTIAL_TENANT_REFUND: "text-inspection",
  LANDLORD_RETAINS_FULL_DEPOSIT: "text-landlord",
  NEEDS_MORE_EVIDENCE: "text-clay",
  ESCALATED: "text-clay",
  APPEALED: "text-clay",
  FINALIZED: "text-paper",
};

export function StatusStamp({ status }: { status: DisputeStatus | string }) {
  const c = COLOR[status] ?? "text-pin/80";
  return <span className={`stamp ${c}`}>{String(status).replace(/_/g, " ")}</span>;
}
