import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import type { Database } from "@/server/data/db";
import { createLink, getLink, listLinks } from "@/server/data/links";
import {
  checkIn,
  createEvent,
  getEvent,
  listAttendance,
  listEvents,
} from "@/server/data/attendance";
import { POST as postLink } from "@/app/api/links/route";

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
  for (const table of [
    "attendance_check_ins",
    "attendance_events",
    "short_links",
  ]) {
    await state.db!.prepare(`DELETE FROM ${table}`).bind().first();
  }
});

it("persists links and rejects duplicate codes", async () => {
  const link = await createLink({
    url: "https://example.com/path?q=1",
    code: "workshop",
  });
  expect(await getLink("workshop")).toEqual(link);
  expect(await listLinks()).toEqual([link]);
  await expect(
    createLink({ url: "https://example.org", code: "workshop" }),
  ).rejects.toMatchObject({ status: 409 });
  expect(await getLink("unknown")).toBeNull();
});
it("paginates links", async () => {
  const first = await createLink({
    url: "https://example.com",
    code: "example-one",
  });
  const second = await createLink({
    url: "https://example.org",
    code: "example-two",
  });
  expect(first.code).not.toBe(second.code);
  expect(await listLinks({ limit: 1 })).toHaveLength(1);
  expect(await listLinks({ limit: 1, offset: 2 })).toEqual([]);
  await expect(listLinks({ limit: 101 })).rejects.toMatchObject({
    status: 400,
  });
});
it.each([
  "javascript:alert(1)",
  "data:text/html,hi",
  "https://user:pass@example.com",
  "not a url",
])("rejects unsafe or invalid URL %s", async (url) => {
  await expect(createLink({ url, code: "unsafe" })).rejects.toMatchObject({
    status: 400,
  });
});
it("keeps attendance per event and deduplicates email case-insensitively", async () => {
  const event = await createEvent({
    name: "Workshop",
    starts_at: "2026-10-25T17:00:00-07:00",
  });
  const other = await createEvent({
    name: "Meeting",
    starts_at: "2026-10-26T00:00:00Z",
  });
  expect((await getEvent(event.id))?.starts_at).toBe(
    "2026-10-26T00:00:00.000Z",
  );
  expect(await listEvents()).toHaveLength(2);
  const first = await checkIn(event.id, {
    name: "Jane",
    email: "JANE@example.com",
  });
  const repeated = await checkIn(event.id, {
    name: "Jane Doe",
    email: "jane@example.com",
  });
  expect(repeated.checked_in_at).toBe(first.checked_in_at);
  expect(repeated.name).toBe("Jane Doe");
  expect(await listAttendance(event.id)).toEqual([repeated]);
  expect(await listAttendance(other.id)).toEqual([]);
  await checkIn(other.id, { name: "Jane", email: "jane@example.com" });
  expect(await listAttendance(other.id)).toHaveLength(1);
});
it("rejects invalid attendance and unknown events", async () => {
  await expect(
    checkIn(crypto.randomUUID(), { name: "Jane", email: "jane@example.com" }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    createEvent({ name: "", starts_at: "bad date" }),
  ).rejects.toMatchObject({ status: 400 });
  const event = await createEvent({
    name: "Meeting",
    starts_at: "2026-10-26T00:00:00Z",
  });
  await expect(
    checkIn(event.id, { name: "Jane", email: "bad" }),
  ).rejects.toMatchObject({ status: 400 });
});
it("requires login for every private read and write helper", async () => {
  state.signedIn = false;
  for (const call of [
    () => createLink({ url: "https://example.com", code: "example-one" }),
    () => listLinks(),
    () => getLink("abc"),
    () => createEvent({ name: "Event", starts_at: "2026-10-26T00:00:00Z" }),
    () => listEvents(),
    () => getEvent(crypto.randomUUID()),
    () => listAttendance(crypto.randomUUID()),
    () =>
      checkIn(crypto.randomUUID(), { name: "Jane", email: "jane@example.com" }),
  ])
    await expect(call()).rejects.toMatchObject({ status: 401 });
});
it("handles JSON, auth, cross-origin writes, and oversized requests", async () => {
  const request = (body: string, headers: Record<string, string> = {}) =>
    new Request("https://internal.ctcusc.com/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
  expect(
    (await postLink(request('{"url":"https://example.com","code":"example"}')))
      .status,
  ).toBe(201);
  expect((await postLink(request("{"))).status).toBe(400);
  expect((await postLink(request("[]"))).status).toBe(400);
  expect(
    (await postLink(request("{}", { Origin: "https://other.example" }))).status,
  ).toBe(403);
  expect(
    (await postLink(request("{}", { "Content-Type": "text/plain" }))).status,
  ).toBe(415);
  expect((await postLink(request(" ".repeat(16_385)))).status).toBe(413);
  state.signedIn = false;
  expect((await postLink(request("{}"))).status).toBe(401);
});
