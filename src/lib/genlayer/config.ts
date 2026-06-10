export const GENLAYER_STUDIONET = {
  name: "GenLayer Studionet",
  chainId: 61999,
  rpcUrl: "https://studio.genlayer.com/api",
  currency: "GEN",
  explorerUrl: "https://explorer-studio.genlayer.com",
};

export const CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS as `0x${string}` | undefined) || "";

export function isContractConfigured(): boolean {
  return !!CONTRACT_ADDRESS && /^0x[0-9a-fA-F]{40}$/.test(CONTRACT_ADDRESS);
}
