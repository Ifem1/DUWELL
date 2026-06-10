"use client";
import { useEffect, useState } from "react";
import { connectWallet, disconnectWallet, getConnectedWallet } from "@/lib/genlayer/wallet";

export function WalletConnect() {
  const [addr, setAddr] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setAddr(getConnectedWallet());
    const onChange = (e: any) => setAddr(e?.detail || "");
    window.addEventListener("duwell-wallet-change", onChange as any);
    if (window.ethereum?.on) {
      window.ethereum.on("accountsChanged", (a: string[]) => {
        const next = a?.[0] || "";
        if (next) window.localStorage.setItem("duwell.wallet", next);
        else window.localStorage.removeItem("duwell.wallet");
        setAddr(next);
      });
    }
    return () => window.removeEventListener("duwell-wallet-change", onChange as any);
  }, []);

  const onClick = async () => {
    setErr(null); setBusy(true);
    try {
      if (addr) {
        disconnectWallet();
        setAddr("");
      } else {
        const a = await connectWallet();
        setAddr(a);
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to connect.");
    } finally { setBusy(false); }
  };

  const short = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  return (
    <div className="flex items-center gap-2">
      <button onClick={onClick} disabled={busy} className="brass-plate px-3 py-2 text-[11px]">
        {busy ? "…" : addr ? `${short} · Disconnect` : "Connect Wallet"}
      </button>
      {err && <span className="text-clay text-[10px]">{err}</span>}
    </div>
  );
}
