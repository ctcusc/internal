import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

// The small subset of the D1 binding used by this app.
interface Statement {
  bind(...values: (string | number | null)[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}

export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown[]>;
}

export async function getDatabase(): Promise<Database> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("D1 binding DB is not configured.");
  return env.DB;
}
