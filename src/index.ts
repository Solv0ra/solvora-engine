// Express application entry point — minimal skeleton so `npm run dev` boots and /health
// and /modules respond. Feature work (indexer, adapters, reports) lands per the build
// order in solvora-meta/issues.md.

import express from "express";
import cors from "cors";
import { pinoHttp } from "pino-http";
import { getModuleRegistry } from "./api/moduleRegistry";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(pinoHttp());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", lastIndexedLedger: null, indexerLagLedgers: null });
  });

  app.get("/modules", (_req, res) => {
    res.json({ data: getModuleRegistry() });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT ?? 3000);
  createApp().listen(port, () => {
    console.log(`solvora-engine listening on http://localhost:${port}`);
  });
}