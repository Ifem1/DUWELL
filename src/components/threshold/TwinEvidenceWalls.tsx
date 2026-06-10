import { EvidenceItem } from "@/types";

export function TwinEvidenceWalls({ evidence }: { evidence: EvidenceItem[] }) {
  const left = evidence.filter((e) => e.phase === "MOVE_IN");
  const right = evidence.filter((e) => e.phase === "MOVE_OUT" || e.phase === "AFTER_MOVE_OUT");
  const mid = evidence.filter((e) => e.phase === "DURING_TENANCY");

  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_120px_1fr] gap-0 mt-4">
      <Wall title="Move-in condition" tone="tenant" items={left} empty="No move-in evidence pinned yet." />
      <div className="divider-rail flex flex-col items-center py-6 gap-3">
        <div className="text-[9px] uppercase tracking-[0.25em] text-pin/70">Difference Rail</div>
        {[
          { label: "Same", color: "text-inspection" },
          { label: "New damage", color: "text-clay" },
          { label: "Pre-existing", color: "text-tenant" },
          { label: "Unclear", color: "text-pin" },
          { label: "Missing proof", color: "text-pin/80" },
        ].map((m) => (
          <div key={m.label} className={`text-[10px] uppercase tracking-[0.18em] ${m.color}`}>{m.label}</div>
        ))}
        {mid.length > 0 && (
          <div className="text-[10px] mt-4 text-brass uppercase tracking-[0.18em]">
            {mid.length} during-tenancy item{mid.length === 1 ? "" : "s"}
          </div>
        )}
      </div>
      <Wall title="Move-out condition" tone="landlord" items={right} empty="No move-out evidence pinned yet." />
    </section>
  );
}

function Wall({
  title, items, empty, tone,
}: { title: string; items: EvidenceItem[]; empty: string; tone: "tenant" | "landlord" }) {
  const tint = "!bg-[#5D3C64] !border-pin";
  return (
    <div className={`paper p-5 ${tint}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-[10px] uppercase tracking-[0.25em] text-pin/80">{title}</div>
        <div className="text-[10px] font-mono text-pin/60">{items.length} pins</div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-pin/60 italic">{empty}</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((e) => (
            <div key={e.id} className="evidence-pin p-3 pt-4">
              <div className="text-[9px] uppercase tracking-widest text-pin/60 font-mono">
                {e.side} · {e.type}
              </div>
              <div className="font-display text-base text-paper mt-1">{e.title}</div>
              <p className="text-[12px] text-pin/80 mt-1 line-clamp-3">{e.description}</p>
              {e.uri && (
                <a href={e.uri} target="_blank" rel="noreferrer" className="text-[11px] text-brass underline mt-2 inline-block break-all">
                  {e.uri.slice(0, 40)}…
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
