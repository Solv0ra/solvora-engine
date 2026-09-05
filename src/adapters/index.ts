// Adapter framework — the extensibility core of Solvora Engine.
// Each EntityType maps to an adapter that turns raw Soroban events into accounting entries.

import type { AccountingEntry, EntityType, SorobanEvent } from "../types/index.js";

export interface LedgerAdapter {
  entityType: EntityType;
  parseEvent(rawEvent: SorobanEvent): AccountingEntry[];
}

export class NotImplementedAdapter implements LedgerAdapter {
  constructor(public entityType: EntityType) {}

  parseEvent(_rawEvent: SorobanEvent): AccountingEntry[] {
    throw new NotImplementedError(
      `Adapter for entity type '${this.entityType}' is not implemented yet. ` +
        "See the adapter issues in solvora-meta/issues.md.",
    );
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}