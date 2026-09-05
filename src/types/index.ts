// Solvora Engine — shared types.
// Amounts are BigInt in the asset's smallest unit. Never use number for token values.

export type EntityType = "Treasury" | "Amm" | "LendingMarket" | "Generic";

export interface Entity {
  id: number;
  owner: string;
  label: string;
  entityType: EntityType;
  contractAddresses: string[];
  createdAt: number;
}

// Placeholder isomorphic to the on-chain Soroban event passed to adapters.
export interface SorobanEvent {
  ledgerSequence: number;
  eventIndex: number;
  contractId: string;
  topic: string[];
  data: unknown;
}

export type EntryType = "inflow" | "outflow" | "balance_change";

export interface AccountingEntry {
  id: string;
  entityId: number;
  entryType: EntryType;
  asset: string;
  amount: bigint;
  counterparty: string | null;
  ledgerSequence: number;
  timestamp: number;
  raw: SorobanEvent;
}

export type ModuleStatus = "live" | "coming_soon";

export interface ModuleInfo {
  id: string;
  name: string;
  status: ModuleStatus;
  description?: string;
}

export interface ReportRow {
  label: string;
  asset: string;
  amount: bigint;
}

export interface Report {
  entityId: number;
  type: "balance_sheet" | "cash_flow";
  generatedAt: number;
  ledgerSequence: number;
  period: { from: number; to: number } | null;
  rows: ReportRow[];
  totals: Record<string, bigint>;
  canonicalHash: string;
}