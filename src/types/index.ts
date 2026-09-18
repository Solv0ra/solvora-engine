// Solvora Engine — shared types.
// Amounts are BigInt in the asset's smallest unit. Never use number for token values.
// Ids come from EVM contracts (uint256) and are therefore BigInt.

export type EntityType = "Treasury" | "Amm" | "LendingMarket" | "Generic";

export interface Entity {
  id: bigint;
  owner: string;
  label: string;
  entityType: EntityType;
  chainId: number;
  contractAddresses: string[];
  createdAt: number;
}

// Placeholder isomorphic to an EVM event/log passed to adapters.
export interface EvmEvent {
  blockNumber: number;
  logIndex: number;
  address: string;
  topics: string[];
  data: string;
}

export type EntryType = "inflow" | "outflow" | "balance_change";

export interface AccountingEntry {
  id: string;
  entityId: bigint;
  entryType: EntryType;
  asset: string;
  amount: bigint;
  counterparty: string | null;
  blockNumber: number;
  timestamp: number;
  description?: string;
  raw: EvmEvent;
}

export type ModuleStatus = "live" | "coming_soon";

export interface ModuleInfo {
  id: string;
  name: string;
  status: ModuleStatus;
  description?: string;
}

export interface ReportRow {
  symbol: string;
  asset: string;
  amount: bigint;
  decimals: number;
  description?: string;
}

export interface ReportSection {
  title: string;
  note?: string;
  rows: ReportRow[];
}

export interface TokenMeta {
  symbol: string;
  decimals: number;
}

// A current holding: an ERC-20 token balance, or native ETH ("native").
export interface AssetBalance {
  asset: string;
  symbol: string;
  decimals: number;
  amount: bigint;
}

export interface ReportPeriod {
  from: number;
  to: number;
  fromTimestamp: number;
  toTimestamp: number;
}

export interface Report {
  entityId: bigint;
  type: "balance_sheet" | "cash_flow";
  generatedAt: number;
  blockNumber: number;
  blockTimestamp: number;
  period: ReportPeriod | null;
  sections: ReportSection[];
  canonicalHash: string;
}
