import Link from "next/link";
import { BrassPlateLink } from "@/components/ui/BrassPlateButton";
import { SetupNotice } from "@/components/ui/SetupNotice";
import { RealDisputePreview } from "@/components/landing/RealDisputePreview";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="pt-8"><SetupNotice /></div>

      {/* Threshold Split Hero */}
      <section className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-0 paper mt-2 overflow-hidden">
        {/* Left: move-in */}
        <div className="p-10 lg:p-14 bg-[#3A1F44]">
          <div className="text-xs uppercase tracking-[0.25em] text-[#D391B0] font-black">Move-in evidence</div>
          <h2 className="font-display text-4xl text-white mt-3 leading-tight">
            Photos, inventory, lease clauses,<br />deposit amount.
          </h2>
          <p className="text-sm text-[#D391B0] mt-4 max-w-md font-semibold">
            The condition the property was in when keys changed hands. Pin everything that
            tells the truthful story of move-in day.
          </p>
        </div>

        {/* Centre mediator bar */}
        <div className="bg-[#0C0420] py-12 lg:py-0 px-6 flex flex-col items-center justify-center text-center min-w-[240px] border-x-2 border-dashed border-ledger">
          <div className="font-display font-black text-5xl tracking-[0.35em] text-paper">DUWELL</div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-pin mt-2 font-black">
            Consensus for rental<br />deposit fairness
          </div>
          <div className="mt-8">
            <BrassPlateLink href="/open-dispute" icon="+">Open a Dispute File</BrassPlateLink>
          </div>
          <div className="mt-3 text-[10px] text-pin/70 uppercase tracking-[0.25em] font-black">
            GenLayer Studionet
          </div>
        </div>

        {/* Right: move-out */}
        <div className="p-10 lg:p-14 bg-[#2A1530] text-right">
          <div className="text-xs uppercase tracking-[0.25em] text-[#D391B0] font-black">Move-out dispute</div>
          <h2 className="font-display text-4xl text-white mt-3 leading-tight">
            Damage claims, receipts,<br />messages, deductions.
          </h2>
          <p className="text-sm text-[#D391B0] mt-4 max-w-md ml-auto font-semibold">
            What the landlord says was found at move-out, and the deductions taken
            from the deposit because of it.
          </p>
          <div className="mt-8 flex justify-end">
            <Link href="/disputes" className="brass-outline px-5 py-3 text-xs !text-white">View Dispute Board</Link>
          </div>
        </div>
      </section>

      {/* Hero copy */}
      <section className="mt-10 grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <h1 className="font-display text-4xl text-paper leading-tight">
            Deposit disputes are rarely black and white.
            <br />
            <span className="text-pin/80">Duwell turns rental evidence into a reviewable consensus outcome.</span>
          </h1>
          <p className="text-pin/80 mt-4 max-w-2xl">
            Compare move-in records, move-out evidence, lease terms, messages, and deductions.
            GenLayer validators interpret responsibility and produce a structured deposit split.
          </p>
        </div>
        <div className="paper p-5">
          <div className="text-[10px] uppercase tracking-[0.25em] text-brass">Threshold metaphor</div>
          <div className="font-mono text-xs mt-3 leading-relaxed text-paper whitespace-pre">
{`MOVE-IN CONDITION
   │
   ▼
DISPUTED DAMAGE
   │
   ▼
MOVE-OUT CONDITION`}
          </div>
        </div>
      </section>

      {/* Evidence Corridor */}
      <section className="mt-14">
        <div className="text-xs uppercase tracking-[0.25em] text-[#3A162B] mb-4 font-bold">Evidence Corridor</div>
        <div className="flex flex-wrap gap-3 items-stretch">
          {[
            "Lease Terms", "Move-in Proof", "Move-out Claim",
            "Cost Ledger", "GenLayer Consensus", "Deposit Split",
          ].map((t, i, arr) => (
            <div key={t} className="flex items-center gap-3">
              <div className="paper px-5 py-4 min-w-[160px]">
                <div className="text-[10px] tracking-[0.2em] text-pin/80/70 uppercase">Room {i + 1}</div>
                <div className="font-display text-lg text-paper">{t}</div>
              </div>
              {i < arr.length - 1 && <div className="text-white font-mono">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* How Duwell judges — offset panels */}
      <section className="mt-16">
        <div className="text-xs uppercase tracking-[0.25em] text-[#3A162B] mb-4 font-bold">How Duwell judges</div>
        <div className="relative h-[300px]">
          {[
            { t: "Condition difference", d: "What changed between move-in and move-out, and whether evidence supports it.", x: "left-0 top-0 rotate-[-1.5deg]" },
            { t: "Lease responsibility", d: "Whether the lease actually permits the deduction being claimed.", x: "left-[28%] top-[28%] rotate-[1deg]" },
            { t: "Fair deposit split", d: "A proportionate refund/retain amount with structured reasoning.", x: "left-[56%] top-[8%] rotate-[-0.5deg]" },
          ].map((p) => (
            <div key={p.t} className={`paper absolute w-[340px] p-5 ${p.x}`}>
              <div className="font-display text-xl text-paper">{p.t}</div>
              <p className="text-sm text-pin/80 mt-2">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <RealDisputePreview />

      {/* GenLayer consensus + why GenLayer */}
      <section className="mt-16 grid lg:grid-cols-2 gap-6">
        <div className="paper p-6">
          <div className="font-display text-2xl text-paper">GenLayer consensus</div>
          <p className="text-sm text-pin/80 mt-3">
            A panel of GenLayer validators reads the lease, move-in record, move-out
            evidence, deduction ledger and condition timeline, then reaches consensus
            on a structured verdict — a decision, a deposit split, per-deduction
            responsibility, and the reasoning behind each call.
          </p>
        </div>
        <div className="paper p-6">
          <div className="font-display text-2xl text-paper">Why this needed GenLayer</div>
          <p className="text-sm text-pin/80 mt-3">
            A normal smart contract can hold the deposit amount and the lease hash, but
            it cannot decide whether a wall mark is wear-and-tear, whether a cleaning
            invoice is reasonable, or whether move-in photos contradict the landlord&apos;s
            claim. Those calls require interpretation of messy, real-world evidence —
            exactly what GenLayer consensus is designed to do.
          </p>
        </div>
      </section>

      <section className="mt-16 mb-8 paper p-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display text-2xl text-paper">Open the first Threshold File.</div>
          <p className="text-sm text-pin/80 mt-1">No demo cases. Every file shown comes from a real submission.</p>
        </div>
        <BrassPlateLink href="/open-dispute" icon="+">Open a Dispute File</BrassPlateLink>
      </section>
    </div>
  );
}
