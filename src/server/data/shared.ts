import "server-only";

import { z } from "zod";
import { getClubSession } from "@/server/auth/server";

export class DataError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function authorize() {
  if (!(await getClubSession())) throw new DataError(401, "Sign in first.");
}

export function parse<T, I>(
  schema: z.ZodType<T, z.ZodTypeDef, I>,
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new DataError(
      400,
      result.error.issues[0]?.message ?? "Invalid input.",
    );
  return result.data;
}

export const pagination = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).max(1_000_000).default(0),
});
export type Page = { limit?: number; offset?: number };

export function pageFromRequest(request: Request): Page {
  const query = new URL(request.url).searchParams;
  return {
    limit: query.has("limit") ? Number(query.get("limit")) : undefined,
    offset: query.has("offset") ? Number(query.get("offset")) : undefined,
  };
}
