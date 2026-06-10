import { Dispute, Lease } from "@/types";

export function LeaseBeam({ dispute, lease }: { dispute: Dispute; lease: Lease | null }) {
  const cells = [
    ["Dispute", `#${dispute.id.slice(0, 14)}`],
    ["Lease", `#${dispute.leaseId.slice(0, 14)}`],
    ["Tenant", short(dispute.tenantWallet)],
    ["Landlord", short(dispute.landlordWallet)],
    ["Deposit", `${dispute.currency} ${dispute.depositAmount}`],
    ["Disputed", `${dispute.currency} ${dispute.amountDisputed}`],
    ["Tenancy", lease ? `${lease.startDate} → ${lease.endDate}` : "—"],
  ];
  return (
    <div className="threshold-bar paper-0 border border-ledger flex flex-wrap divide-x divide-paper/20">
      {cells.map(([k, v]) => (
        <div key={k} className="px-4 py-3 flex-1 min-w-[140px]">
          <div className="text-[9px] uppercase tracking-[0.3em] text-brass/80">{k}</div>
          <div className="font-mono text-sm text-paper mt-1">{v}</div>
        </div>
      ))}
    </div>
  );
}
function short(s: string) { return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s; }
