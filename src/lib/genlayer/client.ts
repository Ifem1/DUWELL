"use client";

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { CONTRACT_ADDRESS, isContractConfigured } from "./config";
import { getConnectedWallet } from "./wallet";

let _readClient: ReturnType<typeof createClient> | null = null;
let _writeClient: ReturnType<typeof createClient> | null = null;
let _writeFor = "";

// Read-only client uses a throwaway key (only used for view calls).
function isValidPk(s: string | null): s is `0x${string}` {
  return !!s && /^0x[0-9a-fA-F]{64}$/.test(s);
}

export function getReadClient() {
  if (_readClient) return _readClient;
  if (typeof window === "undefined") return null;
  let pk = window.localStorage.getItem("duwell.read_pk");
  let account;
  if (isValidPk(pk)) {
    try {
      account = createAccount(pk);
    } catch {
      account = createAccount();
      window.localStorage.setItem("duwell.read_pk", (account as any).privateKey);
    }
  } else {
    account = createAccount();
    window.localStorage.setItem("duwell.read_pk", (account as any).privateKey);
  }
  _readClient = createClient({
    chain: studionet,
    endpoint: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
    account,
  });
  return _readClient;
}

// Write client uses the injected wallet (MetaMask) when connected.
export function getWriteClient() {
  if (typeof window === "undefined") return null;
  const wallet = getConnectedWallet();
  if (!wallet) return null;
  if (_writeClient && _writeFor === wallet) return _writeClient;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  _writeClient = createClient({
    chain: studionet,
    endpoint: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api",
    // @ts-expect-error genlayer-js accepts an injected EIP-1193 transport via `transport`
    transport: eth,
    account: wallet as `0x${string}`,
  });
  _writeFor = wallet;
  return _writeClient;
}

export function getClient() { return getReadClient(); }

export function contractAddress(): `0x${string}` | "" {
  return (CONTRACT_ADDRESS || "") as `0x${string}` | "";
}

export { isContractConfigured };
