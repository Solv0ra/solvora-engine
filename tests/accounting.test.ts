import { describe, it, expect } from "vitest";
import {
  buildBalanceSheet,
  buildCashFlow,
  hashReport,
  NATIVE_ASSET,
} from "../src/accounting/engine";
import type { AccountingEntry, AssetBalance } from "../src/types/index";

function entry(overrides: Partial<AccountingEntry>): AccountingEntry {
  return {
    id: "1:0",
    entityId: 1n,
    entryType: "inflow",
    asset: "0xaaa",
    amount: 100n,
    counterparty: "0xbbb",
    blockNumber: 1,
    timestamp: 0,
    raw: { blockNumber: 1, logIndex: 0, address: "0xaaa", topics: [], data: "0x" },
    ...overrides,
  };
}

const resolveToken = (asset: string) => ({
  symbol: asset === "0xaaa" ? "DAI" : "USDC",
  decimals: 18,
});

describe("buildBalanceSheet", () => {
  it("produces Assets + Liabilities sections with a timestamp", () => {
    const balances: AssetBalance[] = [
      { asset: "0xbbb", symbol: "USDC", decimals: 6, amount: 0n },
      { asset: "0xaaa", symbol: "DAI", decimals: 18, amount: 500n },
      { asset: NATIVE_ASSET, symbol: "ETH", decimals: 18, amount: 1000000n },
    ];

    const report = buildBalanceSheet(1n, balances, 42, 1_700_000_000);

    expect(report.type).toBe("balance_sheet");
    expect(report.blockTimestamp).toBe(1_700_000_000);
    expect(report.period).toBeNull();
    expect(report.sections).toHaveLength(2);

    expect(report.sections[0].title).toBe("Assets");
    expect(report.sections[0].rows).toEqual([
      { symbol: "DAI", asset: "0xaaa", amount: 500n, decimals: 18 },
      { symbol: "ETH", asset: NATIVE_ASSET, amount: 1000000n, decimals: 18 },
    ]);

    expect(report.sections[1].title).toBe("Liabilities & Equity");
    expect(report.sections[1].rows).toEqual([]);
    expect(report.canonicalHash).toMatch(/^0x[0-9a-f]{64}$/);
  });
});

describe("buildCashFlow", () => {
  it("produces b/f, Inflows, Outflows, c/d sections with reconciliation", () => {
    const entries = [
      entry({ id: "1:0", entryType: "inflow", asset: "0xaaa", amount: 100n }),
      entry({ id: "1:1", entryType: "inflow", asset: "0xaaa", amount: 50n }),
      entry({ id: "1:2", entryType: "outflow", asset: "0xaaa", amount: 30n }),
      entry({ id: "1:3", entryType: "inflow", asset: "0xbbb", amount: 200n }),
    ];

    const period = { from: 1, to: 10, fromTimestamp: 1_700_000_000, toTimestamp: 1_700_001_000 };
    const closing = new Map<string, bigint>([
      ["0xaaa", 120n],
      ["0xbbb", 200n],
    ]);

    const report = buildCashFlow(1n, entries, period, resolveToken, closing);

    expect(report.type).toBe("cash_flow");
    expect(report.period).toEqual(period);
    expect(report.sections).toHaveLength(4);

    // b/f: opening = closing - net  (0xaaa: 120 - (150-30) = 0, 0xbbb: 200 - 200 = 0)
    expect(report.sections[0].title).toBe("Balance brought forward (b/f)");
    expect(report.sections[0].rows).toEqual([
      { symbol: "DAI", asset: "0xaaa", amount: 0n, decimals: 18 },
      { symbol: "USDC", asset: "0xbbb", amount: 0n, decimals: 18 },
    ]);

    expect(report.sections[1].title).toBe("Inflows (income)");
    expect(report.sections[1].rows).toEqual([
      { symbol: "DAI", asset: "0xaaa", amount: 150n, decimals: 18 },
      { symbol: "USDC", asset: "0xbbb", amount: 200n, decimals: 18 },
    ]);

    expect(report.sections[2].title).toBe("Outflows (expenses)");
    expect(report.sections[2].rows).toEqual([
      { symbol: "DAI", asset: "0xaaa", amount: 30n, decimals: 18 },
    ]);

    expect(report.sections[3].title).toBe("Balance carried down (c/d)");
    expect(report.sections[3].rows).toEqual([
      { symbol: "DAI", asset: "0xaaa", amount: 120n, decimals: 18 },
      { symbol: "USDC", asset: "0xbbb", amount: 200n, decimals: 18 },
    ]);
  });

  it("includes a Notable events section for tagged outflows", () => {
    const entries = [
      entry({
        id: "1:0",
        entryType: "outflow",
        asset: "0xaaa",
        amount: 100n,
        counterparty: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
        description: "Ronin Bridge Hack (Mar 2022)",
      }),
      entry({ id: "1:1", entryType: "inflow", asset: "0xaaa", amount: 500n }),
    ];

    const period = { from: 1, to: 10, fromTimestamp: 1, toTimestamp: 2 };
    const closing = new Map<string, bigint>([["0xaaa", 400n]]);

    const report = buildCashFlow(1n, entries, period, resolveToken, closing);

    const notable = report.sections.find((s) => s.title === "Notable events");
    expect(notable).toBeDefined();
    expect(notable!.rows).toEqual([
      {
        symbol: "DAI",
        asset: "0xaaa",
        amount: 100n,
        decimals: 18,
        description: "Ronin Bridge Hack (Mar 2022)",
      },
    ]);
  });
});

describe("hashReport", () => {
  it("is deterministic and independent of generatedAt", () => {
    const balances: AssetBalance[] = [
      { asset: "0xaaa", symbol: "DAI", decimals: 18, amount: 500n },
    ];

    const a = buildBalanceSheet(1n, balances, 42, 1_700_000_000);
    const b = buildBalanceSheet(1n, balances, 42, 1_700_000_000);

    expect(a.canonicalHash).toBe(b.canonicalHash);
    expect(hashReport(a)).toBe(a.canonicalHash);
  });
});
