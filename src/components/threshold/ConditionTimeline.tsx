import { TimelineEvent } from "@/types";

export function ConditionTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return (
      <section className="paper p-6 mt-6">
        <div className="text-xs uppercase tracking-[0.25em] text-brass">Condition Timeline</div>
        <div className="font-display text-2xl text-paper mb-2">No timeline events yet</div>
        <p className="text-sm text-pin/70">
          Add events to map move-in inspection, repair requests and move-out inspection.
        </p>
      </section>
    );
  }
  const sorted = [...events].sort((a, b) => (a.at < b.at ? -1 : 1));
  return (
    <section className="paper p-6 mt-6">
      <div className="text-xs uppercase tracking-[0.25em] text-brass mb-3">Condition Timeline</div>
      <ol className="relative border-l border-ledger/60 pl-6 space-y-4">
        {sorted.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-brass border border-ledger" />
            <div className="text-[10px] uppercase tracking-[0.2em] text-pin/70 font-mono">{e.at} · {e.party}</div>
            <div className="font-display text-base text-paper">{e.type.replace(/_/g, " ")}</div>
            <p className="text-sm text-pin/80">{e.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
