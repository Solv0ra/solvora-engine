import { JsonRpcProvider } from "ethers";

// The chain Solvora's own contracts (EntityRegistry, Attestation) are deployed on.
export const REGISTRY_CHAIN_ID = 11155111;

const providers = new Map<number, JsonRpcProvider>();

// Known chainId -> Alchemy subdomain. Set ALCHEMY_API_KEY once and every chain below
// resolves automatically. Add a new chain by appending one line here — no per-chain key.
const ALCHEMY_SUBDOMAINS: Record<number, string> = {
  1: "eth-mainnet",
  42161: "arb-mainnet",
  10: "opt-mainnet",
  8453: "base-mainnet",
  137: "polygon-mainnet",
  11155111: "eth-sepolia",
};

// Optional JSON map of chainId -> RPC URL for custom / non-Alchemy providers, e.g.
//   CHAIN_RPC_URLS={"1":"https://rpc.mevblocker.io"}
// Takes precedence over ALCHEMY_API_KEY for the chains it lists.
function chainRpcUrls(): Record<string, string> {
  const raw = process.env.CHAIN_RPC_URLS;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function resolveRpcUrl(chainId: number): string | undefined {
  const explicit = chainRpcUrls()[String(chainId)];
  if (explicit) return explicit;

  const apiKey = process.env.ALCHEMY_API_KEY;
  const subdomain = ALCHEMY_SUBDOMAINS[chainId];
  if (apiKey && subdomain) return `https://${subdomain}.g.alchemy.com/v2/${apiKey}`;

  if (chainId === REGISTRY_CHAIN_ID) return process.env.SEPOLIA_RPC_URL;

  return undefined;
}

export function getProvider(chainId: number): JsonRpcProvider {
  const url = resolveRpcUrl(chainId);
  if (!url) {
    throw new Error(
      `No RPC URL configured for chain ${chainId}. Set ALCHEMY_API_KEY, CHAIN_RPC_URLS, or SEPOLIA_RPC_URL.`,
    );
  }

  let provider = providers.get(chainId);
  if (!provider) {
    provider = new JsonRpcProvider(url);
    providers.set(chainId, provider);
  }
  return provider;
}

export function getRegistryProvider(): JsonRpcProvider {
  return getProvider(REGISTRY_CHAIN_ID);
}

export function entityRegistryAddress(): string {
  const address = process.env.ENTITY_REGISTRY_ADDRESS;
  if (!address) throw new Error("ENTITY_REGISTRY_ADDRESS is not set");
  return address;
}
