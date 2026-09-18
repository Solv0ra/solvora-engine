// Accounting engine — turns accounting entries and current balances into standard reports.
// Reports are structured as two-sided accounting statements (assets vs liabilities, inflows
// vs outflows, plus opening/closing balances) and canonicalised + keccak256-hashed so a
// report can be verified on-chain.

import { id } from "ethers";
import type {
  AccountingEntry,
  AssetBalance,
  Report,
  ReportPeriod,
  ReportRow,
  ReportSection,
} from "../types/index.js";

export const NATIVE_ASSET = "native";

export type TokenResolver = (asset: string) => { symbol: string; decimals: number };

export function buildBalanceSheet(
  entityId: bigint,
  balances: AssetBalance[],
  blockNumber: number,
  blockTimestamp: number,
): Report {
  const assets: ReportRow[] = balances
    .filter((b) => b.amount !== 0n)
    .map((b) => ({
      symbol: b.symbol,
      asset: b.asset,
      amount: b.amount,
      decimals: b.decimals,
    }))
    .sort((a, b) => a.asset.localeCompare(b.asset));

  const sections: ReportSection[] = [
    { title: "Assets", rows: assets },
    {
      title: "Liabilities & Equity",
      note: "Solvora reports on-chain assets. Liabilities are not yet tracked.",
      rows: [],
    },
  ];

  return finalize({
    entityId,
    type: "balance_sheet",
    blockNumber,
    blockTimestamp,
    period: null,
    sections,
  });
}

export function buildCashFlow(
  entityId: bigint,
  entries: AccountingEntry[],
  period: ReportPeriod,
  resolveToken: TokenResolver,
  closing: Map<string, bigint>,
): Report {
  const inflow = new Map<string, bigint>();
  const outflow = new Map<string, bigint>();
  const meta = new Map<string, { symbol: string; decimals: number }>();

  for (const e of entries) {
    if (!meta.has(e.asset)) meta.set(e.asset, resolveToken(e.asset));
    if (e.entryType === "inflow") {
      inflow.set(e.asset, (inflow.get(e.asset) ?? 0n) + e.amount);
    } else if (e.entryType === "outflow") {
      outflow.set(e.asset, (outflow.get(e.asset) ?? 0n) + e.amount);
    }
  }

  const assets = [...new Set([...inflow.keys(), ...outflow.keys()])].sort();

  const makeRow = (asset: string, amount: bigint): ReportRow => {
    const m = meta.get(asset)!;
    return { symbol: m.symbol, asset, amount, decimals: m.decimals };
  };

  const openingRows: ReportRow[] = [];
  const closingRows: ReportRow[] = [];
  for (const asset of assets) {
    const closingAmt = closing.get(asset) ?? 0n;
    const net = (inflow.get(asset) ?? 0n) - (outflow.get(asset) ?? 0n);
    openingRows.push(makeRow(asset, closingAmt - net));
    closingRows.push(makeRow(asset, closingAmt));
  }

  const sections: ReportSection[] = [
    {
      title: "Balance brought forward (b/f)",
      note: `As of block ${period.from}`,
      rows: openingRows,
    },
    {
      title: "Inflows (income)",
      rows: assets.filter((a) => inflow.has(a)).map((a) => makeRow(a, inflow.get(a)!)),
    },
    {
      title: "Outflows (expenses)",
      rows: assets.filter((a) => outflow.has(a)).map((a) => makeRow(a, outflow.get(a)!)),
    },
    ...notableSection(entries, meta),
    {
      title: "Balance carried down (c/d)",
      note: `As of block ${period.to}`,
      rows: closingRows,
    },
  ];

  return finalize({
    entityId,
    type: "cash_flow",
    blockNumber: period.to,
    blockTimestamp: period.toTimestamp,
    period,
    sections,
  });
}

function finalize(
  report: Omit<Report, "generatedAt" | "canonicalHash">,
): Report {
  const complete: Report = { ...report, generatedAt: Date.now(), canonicalHash: "" };
  complete.canonicalHash = hashReport(complete);
  return complete;
}

// Build a "Notable events" section from entries tagged with a description (e.g. known
// exploits). Empty unless there is at least one tagged entry.
function notableSection(
  entries: AccountingEntry[],
  meta: Map<string, { symbol: string; decimals: number }>,
): ReportSection[] {
  const tagged = entries.filter((e) => e.description);
  if (tagged.length === 0) return [];

  const rows: ReportRow[] = tagged.map((e) => {
    const m = meta.get(e.asset)!;
    return {
      symbol: m.symbol,
      asset: e.asset,
      amount: e.amount,
      decimals: m.decimals,
      description: e.description,
    };
  });

  return [
    {
      title: "Notable events",
      note: "Outflows attributed to known exploits.",
      rows,
    },
  ];
}

// Deterministic serialisation used to hash a report. Excludes non-deterministic fields
// (generatedAt, canonicalHash) so the same data always hashes the same way.
function canonicalize(report: Report): string {
  return JSON.stringify({
    entityId: report.entityId.toString(),
    type: report.type,
    blockNumber: report.blockNumber,
    blockTimestamp: report.blockTimestamp,
    period: report.period,
    sections: report.sections.map((s) => ({
      title: s.title,
      note: s.note ?? null,
      rows: s.rows.map((r) => ({
        symbol: r.symbol,
        asset: r.asset,
        amount: r.amount.toString(),
        decimals: r.decimals,
        description: r.description ?? null,
      })),
    })),
  });
}

export function hashReport(report: Report): string {
  return id(canonicalize(report));
}
