"use client";

import { GENLAYER_STUDIONET } from "./config";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const HEX_CHAIN = "0x" + GENLAYER_STUDIONET.chainId.toString(16);

export async function ensureStudionet() {
  const eth = window.ethereum;
  if (!eth) throw new Error("No injected wallet found. Install MetaMask.");
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX_CHAIN }] });
  } catch (e: any) {
    if (e?.code === 4902 || /Unrecognized chain/i.test(e?.message || "")) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: HEX_CHAIN,
          chainName: GENLAYER_STUDIONET.name,
          nativeCurrency: { name: GENLAYER_STUDIONET.currency, symbol: GENLAYER_STUDIONET.currency, decimals: 18 },
          rpcUrls: [GENLAYER_STUDIONET.rpcUrl],
          blockExplorerUrls: [GENLAYER_STUDIONET.explorerUrl],
        }],
      });
    } else {
      throw e;
    }
  }
}

export async function connectWallet(): Promise<string> {
  const eth = window.ethereum;
  if (!eth) throw new Error("No injected wallet found. Install MetaMask.");
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  await ensureStudionet();
  const addr = accounts?.[0] ?? "";
  if (addr) window.localStorage.setItem("duwell.wallet", addr);
  window.dispatchEvent(new CustomEvent("duwell-wallet-change", { detail: addr }));
  return addr;
}

export function disconnectWallet() {
  window.localStorage.removeItem("duwell.wallet");
  window.dispatchEvent(new CustomEvent("duwell-wallet-change", { detail: "" }));
}

export function getConnectedWallet(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("duwell.wallet") || "";
}
