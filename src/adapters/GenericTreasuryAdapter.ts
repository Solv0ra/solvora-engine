// GenericTreasuryAdapter — the MVP adapter for treasury / multisig entities.
// Turns raw ERC-20 Transfer logs involving the entity's address set into accounting
// entries (inflows / outflows). Native ETH is handled by the indexer's balance snapshot.

import { ZeroAddress, getAddress } from "ethers";
import type { LedgerAdapter } from "./index.js";
import type { AccountingEntry, EntityType, EvmEvent } from "../types/index.js";

export const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";



export class GenericTreasuryAdapter implements LedgerAdapter {
  readonly entityType: EntityType = "Generic";

  private readonly entityAddresses: Set<string>;

  constructor(
    private readonly entityId: bigint,
    entityAddresses: string[],
  ) {
    this.entityAddresses = new Set(entityAddresses.map((a) => a.toLowerCase()));
  }

  parseEvent(rawEvent: EvmEvent): AccountingEntry[] {
    if (rawEvent.topics.length < 3) return [];
    if (rawEvent.topics[0]!.toLowerCase() !== ERC20_TRANSFER_TOPIC) return [];

    const from = topicToAddress(rawEvent.topics[1]!);
    const to = topicToAddress(rawEvent.topics[2]!);
    const value = BigInt(rawEvent.data);

    const fromIsEntity = this.entityAddresses.has(from.toLowerCase());
    const toIsEntity = this.entityAddresses.has(to.toLowerCase());

    if (!fromIsEntity && !toIsEntity) return [];

    // Internal transfer between the entity's own addresses — no net external effect.
    if (fromIsEntity && toIsEntity) return [];

    const entryType = toIsEntity ? "inflow" : "outflow";
    const counterparty =
      entryType === "inflow"
        ? from === ZeroAddress
          ? null
          : from
        : to === ZeroAddress
          ? null
          : to;

    const entry: AccountingEntry = {
      id: `${rawEvent.blockNumber}:${rawEvent.logIndex}`,
      entityId: this.entityId,
      entryType,
      asset: rawEvent.address.toLowerCase(),
      amount: value,
      counterparty,
      blockNumber: rawEvent.blockNumber,
      timestamp: 0,
      raw: rawEvent,
    };

    return [entry];
  }
}

// Indexed event topics store an address as a left-padded 32-byte word. Extract the
// right-most 20 bytes and normalise to a checksummed address.
function topicToAddress(topic: string): string {
  return getAddress(`0x${topic.slice(-40)}`);
}
