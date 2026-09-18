// Curated token list used for balance-sheet token discovery via balanceOf (no archive
// getLogs needed) and for resolving human-readable symbol/decimals in reports. Mainnet for
// now; other chains need their own lists (future work).

export interface ListedToken {
  address: string;
  symbol: string;
  decimals: number;
}

const MAINNET_TOKENS: ListedToken[] = [
  { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", decimals: 18 },
  { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", decimals: 6 },
  { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", decimals: 18 },
  { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", decimals: 8 },
  { address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84", symbol: "stETH", decimals: 18 },
  { address: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32", symbol: "LDO", decimals: 18 },
  { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", decimals: 18 },
  { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", decimals: 18 },
  { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", decimals: 18 },
  { address: "0xD533a949740bb3306d119CC777fa900bA034cd52", symbol: "CRV", decimals: 18 },
  { address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", symbol: "MKR", decimals: 18 },
];

export function tokenListForChain(chainId: number): ListedToken[] {
  if (chainId === 1) return MAINNET_TOKENS;
  return [];
}

// Resolve a human-readable symbol/decimals for a token address. Falls back to a short
// address label + 18 decimals for tokens outside the curated list.
export function resolveToken(
  asset: string,
  chainId: number,
): { symbol: string; decimals: number } {
  const found = tokenListForChain(chainId).find(
    (t) => t.address.toLowerCase() === asset.toLowerCase(),
  );
  if (found) return { symbol: found.symbol, decimals: found.decimals };
  return { symbol: shortAddress(asset), decimals: 18 };
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
