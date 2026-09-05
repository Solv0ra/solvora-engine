// Single source of truth for the module registry served by GET /modules.
// The dashboard renders exactly what this returns — "coming_soon" modules get a designed
// locked card, never a dead route. Adding a module is a config change plus new routes.

import type { ModuleInfo } from "../types";

export const MODULE_REGISTRY: ModuleInfo[] = [
  {
    id: "reporting",
    name: "Financial Reporting",
    status: "live",
    description: "Balance sheets and cash flow statements from real on-chain data.",
  },
  {
    id: "risk-monitor",
    name: "Invariant / Risk Monitor",
    status: "coming_soon",
    description: "Watch registered protocols for invariant breaks and suspicious admin actions.",
  },
  {
    id: "proof-of-reserve",
    name: "Proof of Reserve",
    status: "coming_soon",
    description: "Public attestation dashboard for BTC-backed and wrapped assets on Stellar.",
  },
];

export function getModuleRegistry(): ModuleInfo[] {
  return MODULE_REGISTRY;
}