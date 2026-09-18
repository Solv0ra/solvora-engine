import { describe, it, expect } from "vitest";
import { ZeroAddress, getAddress } from "ethers";
import {
  GenericTreasuryAdapter,
  ERC20_TRANSFER_TOPIC,
} from "../src/adapters/GenericTreasuryAdapter";
import type { EvmEvent } from "../src/types/index";

const entity = getAddress("0x0000000000000000000000000000000000000001");
const entity2 = getAddress("0x0000000000000000000000000000000000000003");
const other = getAddress("0x0000000000000000000000000000000000000002");
const token = getAddress("0x00000000000000000000000000000000000000aa");

function pad(addr: string): string {
  return `0x${"0".repeat(24)}${addr.slice(2).toLowerCase()}`;
}

function transferEvent(from: string, to: string, value: bigint): EvmEvent {
  return {
    blockNumber: 100,
    logIndex: 0,
    address: token,
    topics: [ERC20_TRANSFER_TOPIC, pad(from), pad(to)],
    data: `0x${value.toString(16).padStart(64, "0")}`,
  };
}

describe("GenericTreasuryAdapter", () => {
  const adapter = new GenericTreasuryAdapter(7n, [entity, entity2]);

  it("classifies a transfer to the entity as an inflow", () => {
    const [entry] = adapter.parseEvent(transferEvent(other, entity, 1234n));
    expect(entry).toBeDefined();
    expect(entry!.entryType).toBe("inflow");
    expect(entry!.amount).toBe(1234n);
    expect(entry!.asset).toBe(token.toLowerCase());
    expect(entry!.counterparty).toBe(other);
    expect(entry!.entityId).toBe(7n);
  });

  it("classifies a transfer from the entity as an outflow", () => {
    const [entry] = adapter.parseEvent(transferEvent(entity, other, 500n));
    expect(entry!.entryType).toBe("outflow");
    expect(entry!.amount).toBe(500n);
    expect(entry!.counterparty).toBe(other);
  });

  it("treats a mint (from zero address) as an inflow with no counterparty", () => {
    const [entry] = adapter.parseEvent(transferEvent(ZeroAddress, entity, 100n));
    expect(entry!.entryType).toBe("inflow");
    expect(entry!.counterparty).toBeNull();
  });

  it("treats a burn (to zero address) as an outflow with no counterparty", () => {
    const [entry] = adapter.parseEvent(transferEvent(entity, ZeroAddress, 100n));
    expect(entry!.entryType).toBe("outflow");
    expect(entry!.counterparty).toBeNull();
  });

  it("ignores internal transfers within the entity address set", () => {
    const entries = adapter.parseEvent(transferEvent(entity, entity2, 999n));
    expect(entries).toEqual([]);
  });

  it("ignores transfers not involving the entity", () => {
    const entries = adapter.parseEvent(transferEvent(other, getAddress("0x0000000000000000000000000000000000000004"), 1n));
    expect(entries).toEqual([]);
  });

  it("ignores non-transfer topics", () => {
    const event = transferEvent(other, entity, 1n);
    event.topics[0] = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    expect(adapter.parseEvent(event)).toEqual([]);
  });
});
