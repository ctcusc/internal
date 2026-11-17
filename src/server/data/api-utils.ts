import "server-only";

import { DataError } from "./shared";

const MAX_RECORD_BYTES = 16_384;

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function dataError(error: unknown) {
  if (error instanceof DataError)
    return json({ error: error.message }, error.status);
  console.error("Project data request failed.");
  return json({ error: "Data is temporarily unavailable." }, 503);
}

export async function readData(
  request: Request,
): Promise<Record<string, unknown>> {
  const origin = request.headers.get("origin");
  if (
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new DataError(403, "Cross-origin writes are not allowed.");
  }
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
    "application/json"
  ) {
    throw new DataError(415, "Use Content-Type: application/json.");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new DataError(400, "Provide a JSON object.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RECORD_BYTES) {
        await reader.cancel();
        throw new DataError(413, "Data must be at most 16 KiB.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const data: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(body),
    );
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data as Record<string, unknown>;
  } catch {
    throw new DataError(400, "Provide a valid JSON object.");
  }
}
