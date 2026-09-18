// Express application entry point. Exposes health, module registry, and entity/report
// endpoints backed by the on-chain EntityRegistry and the EVM indexer.

import "dotenv/config";
import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { getModuleRegistry } from "./api/moduleRegistry.js";
import { getProvider, getRegistryProvider, entityRegistryAddress } from "./services/rpc.js";
import { listEntities, getEntity } from "./services/contracts.js";
import { Indexer } from "./indexer/indexer.js";
import { buildBalanceSheet, buildCashFlow } from "./accounting/engine.js";
import { resolveToken } from "./services/tokens.js";
import { friendlyError } from "./services/errors.js";
import { sendJson } from "./services/serialize.js";

// Cash-flow uses eth_getLogs, which is capped per call on free tiers (~10k blocks) and
// heavily restricted on public RPCs. The default scans this window; pass ?from= / ?to= on a
// real RPC (Alchemy/Infura) for longer periods. Pagination for large windows is future work.
const LOOKBACK_BLOCKS = 9_000;

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", lastIndexedBlock: null, indexerLagBlocks: null });
  });

  app.get("/modules", (_req, res) => {
    res.json({ data: getModuleRegistry() });
  });

  app.get("/entities", async (_req, res) => {
    try {
      const entities = await listEntities(getRegistryProvider(), entityRegistryAddress());
      sendJson(res, 200, { data: entities });
    } catch (err) {
      res.status(503).json({ error: friendlyError(err) });
    }
  });

  app.get("/entities/:id", async (req, res) => {
    try {
      const entity = await getEntity(
        getRegistryProvider(),
        entityRegistryAddress(),
        BigInt(req.params.id),
      );
      sendJson(res, 200, { data: entity });
    } catch (err) {
      res.status(503).json({ error: friendlyError(err) });
    }
  });

  app.get("/entities/:id/reports", async (req, res) => {
    try {
      const entityId = BigInt(req.params.id);
      const entity = await getEntity(getRegistryProvider(), entityRegistryAddress(), entityId);
      const addresses = entity.contractAddresses;

      // Entity activity lives on the entity's own chain, not the registry chain.
      const provider = getProvider(entity.chainId);
      const indexer = new Indexer(provider);
      const type = req.query.type === "cash_flow" ? "cash_flow" : "balance_sheet";

      const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
      const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;

      // Dates resolve to the block at 00:00 UTC. A cash-flow "to" date includes its full
      // day (through 23:59:59); a balance sheet snapshots at 00:00 of the selected date.
      const toBlock = toDate
        ? await indexer.timestampToBlock(
            dateToMidnightTimestamp(toDate) + (type === "cash_flow" ? 86_400 : 0),
          )
        : parseBlockParam(req.query.to) ?? (await provider.getBlockNumber());

      const fromBlock = fromDate
        ? await indexer.timestampToBlock(dateToMidnightTimestamp(fromDate))
        : parseBlockParam(req.query.from) ?? Math.max(0, toBlock - LOOKBACK_BLOCKS);

      if (type === "balance_sheet") {
        const [tokenBalances, native, blockTimestamp] = await Promise.all([
          indexer.getTokenBalances(addresses, toBlock, entity.chainId),
          indexer.getNativeBalance(addresses, toBlock),
          indexer.getBlockTimestamp(toBlock),
        ]);
        const report = buildBalanceSheet(
          entityId,
          [...tokenBalances, native],
          toBlock,
          blockTimestamp,
        );
        sendJson(res, 200, { data: report });
      } else {
        const entries = await indexer.getEntries(entityId, addresses, fromBlock, toBlock);
        const assets = [...new Set(entries.map((e) => e.asset))];
        const [closing, fromTimestamp, toTimestamp] = await Promise.all([
          indexer.getBalancesForAssets(addresses, assets, toBlock),
          indexer.getBlockTimestamp(fromBlock),
          indexer.getBlockTimestamp(toBlock),
        ]);
        const report = buildCashFlow(
          entityId,
          entries,
          { from: fromBlock, to: toBlock, fromTimestamp, toTimestamp },
          (asset) => resolveToken(asset, entity.chainId),
          closing,
        );
        sendJson(res, 200, { data: report });
      }
    } catch (err) {
      res.status(503).json({ error: friendlyError(err) });
    }
  });

  return app;
}

function parseBlockParam(value: unknown): number | null {
  if (typeof value !== "string" || value.length === 0) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function dateToMidnightTimestamp(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return Math.floor(d.getTime() / 1000);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    console.log(`solvora-engine listening on http://localhost:${port}`);
  });
}
