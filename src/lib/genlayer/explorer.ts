import { GENLAYER_STUDIONET } from "./config";

export function getExplorerAddressUrl(address: string) {
  return `${GENLAYER_STUDIONET.explorerUrl}/address/${address}`;
}
export function getExplorerTxUrl(txHash: string) {
  return `${GENLAYER_STUDIONET.explorerUrl}/tx/${txHash}`;
}
