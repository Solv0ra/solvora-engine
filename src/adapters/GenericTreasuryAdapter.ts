// GenericTreasuryAdapter — MVP adapter: simple transfers / balance changes for a
// treasury or multisig address set. Implementation lands with the first engine wave
// (solvora-meta/issues.md → engine group).

import { NotImplementedError } from "./index.js";
import type { AccountingEntry, SorobanEvent } from "../types/index.js";

export class GenericTreasuryAdapter {
  parseEvent(_rawEvent: SorobanEvent): AccountingEntry[] {
    throw new NotImplementedError(
      "GenericTreasuryAdapter is scheduled for the first engine wave.",
    );
  }
}