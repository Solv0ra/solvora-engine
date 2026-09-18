// Curated registry of known on-chain exploit events, keyed by the attacker address that
// received the stolen funds. Used to annotate suspicious outflows in reports. Mainnet only
// for now; extend with more events / chains as needed.

export interface KnownEvent {
  label: string;
  attacker: string;
}

const KNOWN_EVENTS: KnownEvent[] = [
  {
    label: "Ronin Bridge Hack (Mar 2022)",
    attacker: "0x098B716B8Aaf21512996dC57EB0615e2383E2f96",
  },
  {
    label: "Wormhole Bridge Hack (Feb 2022)",
    attacker: "0x629e7Da20197a5429d30da36E77d06CdF796b71A",
  },
  {
    label: "Euler Finance Hack (Mar 2023)",
    attacker: "0xb66cd966670d962C227B3EABA30a872DbFb995db",
  },
];

export function matchKnownEvent(counterparty: string): string | null {
  const addr = counterparty.toLowerCase();
  const event = KNOWN_EVENTS.find((e) => e.attacker.toLowerCase() === addr);
  return event?.label ?? null;
}
