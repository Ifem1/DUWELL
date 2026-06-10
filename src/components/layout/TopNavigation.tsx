import Link from "next/link";
import { WalletConnect } from "./WalletConnect";

export function TopNavigation() {
  return (
    <header className="border-b-2 border-[#5D3C64] bg-[#F5EBF1]/70 backdrop-blur-sm sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-black text-2xl tracking-[0.3em] text-[#0C0420]">
          DUWELL
        </Link>
        <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.2em] text-[#5D3C64] font-black">
          <Link href="/disputes" className="hover:text-brass">Dispute Board</Link>
          <Link href="/leases" className="hover:text-brass">Lease Vault</Link>
          <Link href="/open-dispute" className="brass-plate px-3 py-2 text-[11px]">Open File</Link>
          <WalletConnect />
        </nav>
      </div>
    </header>
  );
}
