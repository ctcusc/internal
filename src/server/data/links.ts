import "server-only";

import { z } from "zod";
import { getDatabase } from "./db";
import { authorize, DataError, pagination, parse, type Page } from "./shared";

const MAX_GENERATED_CODE_ATTEMPTS = 5;
const codeSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9_-]{3,64}$/,
    "Code must be 3–64 letters, numbers, underscores, or hyphens.",
  );
const linkSchema = z
  .object({
    code: codeSchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    url: z
      .string()
      .url()
      .max(2048)
      .refine((value) => {
        const url = URL.parse(value);
        return (
          url !== null &&
          ["http:", "https:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        );
      }, "Use an HTTP or HTTPS URL without embedded credentials."),
  })
  .strict();
export type NewLink = z.infer<typeof linkSchema>;
export type ShortLink = {
  code: string;
  url: string;
  title: string | null;
  created_at: string;
};

export async function createLink(input: NewLink): Promise<ShortLink> {
  await authorize();
  const data = parse(linkSchema, input);
  const db = await getDatabase();
  const insert = db.prepare(
    `INSERT INTO short_links (code, url, title) VALUES (?, ?, ?)
     ON CONFLICT(code) DO NOTHING RETURNING code, url, title, created_at`,
  );
  const attempts = data.code === undefined ? MAX_GENERATED_CODE_ATTEMPTS : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const code = data.code ?? crypto.randomUUID().slice(-12);
    const row = await insert
      .bind(code, data.url, data.title ?? null)
      .first<ShortLink>();
    if (row) return row;
  }
  throw new DataError(
    409,
    data.code === undefined
      ? "Could not generate an unused short code. Try again."
      : "That short code is already taken.",
  );
}

export async function listLinks(options: Page = {}): Promise<ShortLink[]> {
  await authorize();
  const { limit, offset } = parse(pagination, options);
  const db = await getDatabase();
  const { results } = await db
    .prepare(
      "SELECT code, url, title, created_at FROM short_links ORDER BY created_at DESC, code LIMIT ? OFFSET ?",
    )
    .bind(limit, offset)
    .all<ShortLink>();
  return results;
}

export async function getLink(code: string): Promise<ShortLink | null> {
  await authorize();
  parse(codeSchema, code);
  const db = await getDatabase();
  return db
    .prepare(
      "SELECT code, url, title, created_at FROM short_links WHERE code = ?",
    )
    .bind(code)
    .first<ShortLink>();
}
