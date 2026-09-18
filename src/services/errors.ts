// Maps raw RPC / ethers / config errors to clean, user-facing messages so the API never
// leaks stack traces or cryptic provider text.

export function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  if (/SEPOLIA_RPC_URL is not set|ENTITY_REGISTRY_ADDRESS is not set|ATTESTATION_ADDRESS is not set/.test(msg)) {
    return "The engine is not fully configured. Check its environment variables.";
  }

  const chainMatch = msg.match(/No RPC URL configured for chain (\d+)/);
  if (chainMatch) {
    return `This entity lives on chain ${chainMatch[1]}, which has no RPC configured. Set ALCHEMY_API_KEY or add it to CHAIN_RPC_URLS.`;
  }

  if (/Archive requests|archive|ranges over .* blocks|eth_getLogs/i.test(msg)) {
    return "This RPC provider does not support the historical event queries needed for cash-flow reports. Use a full node provider such as Alchemy or Infura.";
  }

  if (/data type size mismatch|invalid argument|bad request/i.test(msg)) {
    return "The RPC provider rejected the request. Try a different RPC endpoint.";
  }

  if (/NETWORK_ERROR|ECONNREFUSED|connection refused|fetch failed|ENOTFOUND|ETIMEDOUT|525|429/.test(msg)) {
    return "Could not reach the blockchain RPC. Check your connection and RPC URL.";
  }

  if (/entity.*not found|does not exist|execution reverted/i.test(msg)) {
    return "This entity could not be found on the registry.";
  }

  return "Something went wrong while generating the report. Please try again.";
}
