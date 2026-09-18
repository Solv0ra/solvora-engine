// Adapter framework — the extensibility core of Solvora Engine.
// Each EntityType maps to an adapter that turns raw EVM events into accounting entries.

import type { AccountingEntry, EntityType, EvmEvent } from "../types/index.js";

export interface LedgerAdapter {
  readonly entityType: EntityType;
  parseEvent(rawEvent: EvmEvent): AccountingEntry[];
}

export { GenericTreasuryAdapter } from "./GenericTreasuryAdapter.js";
