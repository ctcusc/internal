// CTC-39: server-side short-code generation for POST /api/links.
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import { POST as postLink } from "@/app/api/links/route";
import type { Database } from "@/server/data/db";
import {
  createLink,
  generateCode,
  getLink,
  listLinks,
  MAX_CODE_ATTEMPTS,
} from "@/server/data/links";

const state = vi.hoisted(() => ({
  signedIn: true,
  db: null as Database | null,
}));
vi.mock("@/server/auth/server", () => ({
  getClubSession: async () => (state.signedIn ? {} : null),
}));
vi.mock("@/server/data/db", () => ({ getDatabase: async () => state.db }));
let dispose: () => Promise<void>;

beforeAll(async () => {
  const proxy = await getPlatformProxy<{
    DB: Database & { exec(sql: string): Promise<unknown> };
  }>({ persist: false });
  dispose = proxy.dispose;
  state.db = proxy.env.DB;
  // short_links comes from the first migration.
  const migration = await readFile(
    new URL("../migrations/0001_links_and_attendance.sql", import.meta.url),
    "utf8",
  );
  await proxy.env.DB.exec(migration.replaceAll("\n", " "));
}, 30_000);
afterAll(async () => {
  await dispose?.();
});
beforeEach(async () => {
  state.signedIn = true;
  await state.db!.prepare("DELETE FROM short_links").bind().first();
});

const CODE = /^[2-9a-hjkmnp-z]{7}$/;

it("generates a code when none is given", async () => {
  const link = await createLink({
    url: "https://example.com/event",
    title: "Event",
  });
  expect(link.code).toMatch(CODE);
  expect(link).toMatchObject({ url: "https://example.com/event" });
  expect(await getLink(link.code)).toEqual(link);
});

it("generates distinct codes from the allowed alphabet", () => {
  const codes = new Set(Array.from({ length: 1000 }, generateCode));
  expect(codes.size).toBe(1000);
  for (const code of codes) expect(code).toMatch(CODE);
});

it("retries a generated-code collision without overwriting", async () => {
  const existing = await createLink({
    url: "https://example.com/original",
    code: "taken01",
  });
  const codes = ["taken01", "taken01", "fresh01"];
  const generate = vi.fn(() => codes.shift()!);
  const link = await createLink(
    { url: "https://example.com/new" },
    { generateCode: generate },
  );
  expect(link).toMatchObject({
    code: "fresh01",
    url: "https://example.com/new",
  });
  expect(generate).toHaveBeenCalledTimes(3);
  expect(await getLink("taken01")).toEqual(existing);
});

it("gives up after a bounded number of collisions", async () => {
  const existing = await createLink({
    url: "https://example.com/original",
    code: "taken01",
  });
  const generate = vi.fn(() => "taken01");
  await expect(
    createLink({ url: "https://example.com/new" }, { generateCode: generate }),
  ).rejects.toMatchObject({ status: 409 });
  expect(generate).toHaveBeenCalledTimes(MAX_CODE_ATTEMPTS);
  expect(await listLinks()).toEqual([existing]);
});

it("validates the URL before generating a code", async () => {
  const generate = vi.fn(() => "unused01");
  await expect(
    createLink({ url: "javascript:alert(1)" }, { generateCode: generate }),
  ).rejects.toMatchObject({ status: 400 });
  expect(generate).not.toHaveBeenCalled();
});

it("keeps explicit codes and their 409 on duplicates", async () => {
  const generate = vi.fn(() => "unused01");
  const link = await createLink(
    { url: "https://example.com", code: "workshop" },
    { generateCode: generate },
  );
  expect(link.code).toBe("workshop");
  await expect(
    createLink(
      { url: "https://example.org", code: "workshop" },
      { generateCode: generate },
    ),
  ).rejects.toMatchObject({ status: 409 });
  expect(generate).not.toHaveBeenCalled();
});

it("POST /api/links accepts a URL without a code", async () => {
  const request = (body: unknown) =>
    new Request("https://internal.ctcusc.com/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const response = await postLink(request({ url: "https://example.com/a" }));
  expect(response.status).toBe(201);
  const { link } = (await response.json()) as {
    link: { code: string; url: string; title: string | null };
  };
  expect(link.code).toMatch(CODE);
  expect(link).toMatchObject({ url: "https://example.com/a", title: null });

  expect((await postLink(request({ url: "ftp://example.com" }))).status).toBe(
    400,
  );
  expect(
    (await postLink(request({ url: "https://example.com", code: link.code })))
      .status,
  ).toBe(409);
  state.signedIn = false;
  expect(
    (await postLink(request({ url: "https://example.com/b" }))).status,
  ).toBe(401);
});
