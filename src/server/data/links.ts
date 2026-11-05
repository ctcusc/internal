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
    // Omit to have the server generate one.
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

// Lowercase without look-alikes (0/o, 1/l/i) so printed codes are easy to type.
const CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
const GENERATED_CODE_LENGTH = 7; // 31^7 ≈ 27.5 billion codes
export const MAX_CODE_ATTEMPTS = 5;

export function generateCode(): string {
  // Reject bytes past the last full multiple of the alphabet to avoid bias.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let code = "";
  while (code.length < GENERATED_CODE_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < limit && code.length < GENERATED_CODE_LENGTH)
        code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return code;
}

/**
 * Saves a link. Without `code`, generates one and retries a collision up to
 * MAX_CODE_ATTEMPTS times. Existing links are never overwritten.
 * `options.generateCode` exists for tests.
 */
export async function createLink(
  input: NewLink,
  options: { generateCode?: () => string } = {},
): Promise<ShortLink> {
  await authorize();
  const data = parse(linkSchema, input);
  const db = await getDatabase();
  const insert = (code: string) =>
    db
      .prepare(
        `INSERT INTO short_links (code, url, title) VALUES (?, ?, ?)
         ON CONFLICT(code) DO NOTHING RETURNING code, url, title, created_at`,
      )
      .bind(code, data.url, data.title ?? null)
      .first<ShortLink>();

  if (data.code !== undefined) {
    const row = await insert(data.code);
    if (!row) throw new DataError(409, "That short code is already taken.");
    return row;
  }

  const nextCode = options.generateCode ?? generateCode;
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const row = await insert(parse(codeSchema, nextCode()));
    if (row) return row;
  }
  throw new DataError(
    409,
    "Could not generate a unique short code. Try again.",
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
