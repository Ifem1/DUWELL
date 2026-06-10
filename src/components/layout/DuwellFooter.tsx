import { GENLAYER_STUDIONET } from "@/lib/genlayer/config";

export function DuwellFooter() {
  return (
    <footer className="border-t-2 border-ledger bg-[#0C0420] text-paper mt-20">
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="font-display text-xl tracking-widest">DUWELL</div>
          <p className="text-xs opacity-70 max-w-md mt-2">
            Duwell provides decentralised lease and evidence review. It is not legal advice
            or a court judgement unless adopted by the relevant parties or platform.
          </p>
        </div>
        <div className="text-xs font-mono opacity-80 space-y-1">
          <div>{GENLAYER_STUDIONET.name} · chain {GENLAYER_STUDIONET.chainId}</div>
          <a className="underline hover:text-brass" href={GENLAYER_STUDIONET.explorerUrl} target="_blank" rel="noreferrer">
            {GENLAYER_STUDIONET.explorerUrl}
          </a>
        </div>
      </div>
    </footer>
  );
}
