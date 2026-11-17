import "server-only";

import { z } from "zod";
import { getDatabase } from "./db";
import { authorize, DataError, pagination, parse, type Page } from "./shared";

const codeSchema = z
  .string()
  .regex(
    /^[a-zA-Z0-9_-]{3,64}$/,
    "Code must be 3–64 letters, numbers, underscores, or hyphens.",
  );
const linkSchema = z
  .object({
    code: codeSchema,
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
  const row = await db
    .prepare(
      `INSERT INTO short_links (code, url, title) VALUES (?, ?, ?)
       ON CONFLICT(code) DO NOTHING RETURNING code, url, title, created_at`,
    )
    .bind(data.code, data.url, data.title ?? null)
    .first<ShortLink>();
  if (!row) throw new DataError(409, "That short code is already taken.");
  return row;
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
