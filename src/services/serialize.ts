import type { Response } from "express";

// JSON.stringify cannot serialise bigint. Reports and entities use bigint for amounts and
// ids, so serialize those as decimal strings at the API boundary.
const BIGINT_REPLACER = (_key: string, value: unknown): unknown =>
  typeof value === "bigint" ? value.toString() : value;

export function sendJson(res: Response, status: number, value: unknown): void {
  res.status(status).type("application/json").send(JSON.stringify(value, BIGINT_REPLACER));
}
