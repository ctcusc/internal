import { readFile, readdir } from "node:fs/promises";
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
  type AttendanceEvent,
  type CheckIn,
} from "@/server/data/attendance";
import { POST as postLink } from "@/app/api/links/route";
import { POST as postEvent } from "@/app/api/events/route";
import {
  GET as getAttendance,
  POST as postAttendance,
} from "@/app/api/events/[id]/attendance/route";

const state = vi.hoisted(() => ({
  signedIn: true,
  db: null as Database | null,
}));
vi.mock("@/server/auth/server", () => ({
  getClubSession: async () => (state.signedIn ? {} : null),
}));
vi.mock("@/server/data/db", () => ({ getDatabase: async () => state.db }));
let dispose: () => Promise<void>;
let migrations: string[];

const validEvent = {
  name: "Workshop",
  event_type: "workshop",
  starts_at: "2026-10-25T17:00:00-07:00",
  ends_at: "2026-10-26T01:00:00Z",
  location: "Engineering Hall",
};
const eventRequest = (data: unknown) =>
  new Request("https://internal.ctcusc.com/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
const attendanceRequest = (eventId: string) =>
  new Request(`https://internal.ctcusc.com/api/events/${eventId}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Jane", email: "jane@example.com" }),
  });
const attendanceContext = (id: string) => ({ params: Promise.resolve({ id }) });

async function applyMigrations(
  db: Database & { exec(sql: string): Promise<unknown> },
  sql: string[],
) {
  for (const migration of sql) {
    // D1 exec expects one-line statements; remove line comments before joining.
    await db.exec(migration.replace(/^\s*--.*$/gm, "").replaceAll("\n", " "));
  }
}

beforeAll(async () => {
  const proxy = await getPlatformProxy<{
    DB: Database & { exec(sql: string): Promise<unknown> };
  }>({ persist: false });
  dispose = proxy.dispose;
  state.db = proxy.env.DB;
  const directory = new URL("../migrations/", import.meta.url);
  const filenames = (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  migrations = await Promise.all(
    filenames.map((name) => readFile(new URL(name, directory), "utf8")),
  );
  await applyMigrations(proxy.env.DB, migrations);
}, 30_000);
afterAll(async () => {
  await dispose?.();
});
beforeEach(async () => {
  vi.restoreAllMocks();
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
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-26T00:30:00Z"));
  const event = await createEvent({
    name: "Workshop",
    event_type: "workshop",
    starts_at: "2026-10-25T17:00:00-07:00",
    ends_at: "2026-10-25T18:00:00-07:00",
  });
  const other = await createEvent({
    name: "Meeting",
    event_type: "general meeting",
    starts_at: "2026-10-26T00:00:00Z",
    ends_at: "2026-10-26T01:00:00Z",
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
  vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-26T00:30:00Z"));
  await expect(
    checkIn(crypto.randomUUID(), { name: "Jane", email: "jane@example.com" }),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    createEvent({ ...validEvent, name: "", starts_at: "bad date" }),
  ).rejects.toMatchObject({ status: 400 });
  const event = await createEvent({
    name: "Meeting",
    event_type: "general meeting",
    starts_at: "2026-10-26T00:00:00Z",
    ends_at: "2026-10-26T01:00:00Z",
  });
  await expect(
    checkIn(event.id, { name: "Jane", email: "bad" }),
  ).rejects.toMatchObject({ status: 400 });
});
it("accepts check-in from the start through the final millisecond and preserves its first timestamp", async () => {
  const event = await createEvent(validEvent);
  const now = vi.spyOn(Date, "now");
  now.mockReturnValue(Date.parse("2026-10-26T00:00:00.000Z"));
  const firstResponse = await postAttendance(
    attendanceRequest(event.id),
    attendanceContext(event.id),
  );
  expect(firstResponse.status).toBe(200);
  const { checkIn: first } = (await firstResponse.json()) as {
    checkIn: CheckIn;
  };

  now.mockReturnValue(Date.parse("2026-10-26T00:59:59.999Z"));
  const repeatedResponse = await postAttendance(
    new Request(attendanceRequest(event.id).url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jane Doe", email: "JANE@example.com" }),
    }),
    attendanceContext(event.id),
  );
  expect(repeatedResponse.status).toBe(200);
  const { checkIn: repeated } = (await repeatedResponse.json()) as {
    checkIn: CheckIn;
  };
  expect(repeated.checked_in_at).toBe(first.checked_in_at);
  expect(repeated.name).toBe("Jane Doe");
  expect(await listAttendance(event.id)).toEqual([repeated]);
});
it.each([
  ["before the event", "2026-10-25T23:59:59.999Z"],
  ["at the event end", "2026-10-26T01:00:00.000Z"],
  ["after the event", "2026-10-26T01:00:00.001Z"],
])(
  "rejects check-in %s but keeps organizer attendance readable",
  async (_state, time) => {
    const event = await createEvent(validEvent);
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(time));
    const response = await postAttendance(
      attendanceRequest(event.id),
      attendanceContext(event.id),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Check-in is available only while the event is live.",
    });
    expect(await listAttendance(event.id)).toEqual([]);
    const getResponse = await getAttendance(
      new Request(attendanceRequest(event.id).url),
      attendanceContext(event.id),
    );
    expect(getResponse.status).toBe(200);
    expect(await getResponse.json()).toEqual({ attendance: [] });
  },
);
it("keeps recorded attendance available to organizers after the event ends", async () => {
  const event = await createEvent(validEvent);
  const now = vi.spyOn(Date, "now");
  now.mockReturnValue(Date.parse("2026-10-26T00:30:00Z"));
  const checkInResponse = await postAttendance(
    attendanceRequest(event.id),
    attendanceContext(event.id),
  );
  expect(checkInResponse.status).toBe(200);
  const { checkIn } = (await checkInResponse.json()) as { checkIn: CheckIn };
  now.mockReturnValue(Date.parse("2026-10-26T01:00:00Z"));
  const response = await getAttendance(
    new Request(attendanceRequest(event.id).url),
    attendanceContext(event.id),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ attendance: [checkIn] });
});
it("requires login for every private read and write helper", async () => {
  state.signedIn = false;
  for (const call of [
    () => createLink({ url: "https://example.com", code: "example-one" }),
    () => listLinks(),
    () => getLink("abc"),
    () => createEvent(validEvent),
    () => listEvents(),
    () => getEvent(crypto.randomUUID()),
    () => listAttendance(crypto.randomUUID()),
    () =>
      checkIn(crypto.randomUUID(), { name: "Jane", email: "jane@example.com" }),
  ])
    await expect(call()).rejects.toMatchObject({ status: 401 });
});

it.each(["general meeting", "workshop", "other", "community night"])(
  "saves and reads an event with type %s and a valid time range",
  async (event_type) => {
    const event = await createEvent({
      ...validEvent,
      event_type: ` ${event_type} `,
    });
    expect(event).toMatchObject({
      name: validEvent.name,
      event_type,
      starts_at: "2026-10-26T00:00:00.000Z",
      ends_at: "2026-10-26T01:00:00.000Z",
      location: validEvent.location,
    });
    expect(await getEvent(event.id)).toEqual(event);
    expect(await listEvents()).toEqual([event]);
  },
);

it("creates an event through the API and returns the new fields", async () => {
  const response = await postEvent(eventRequest(validEvent));
  expect(response.status).toBe(201);
  const { event } = (await response.json()) as { event: AttendanceEvent };
  expect(event).toMatchObject({
    event_type: "workshop",
    starts_at: "2026-10-26T00:00:00.000Z",
    ends_at: "2026-10-26T01:00:00.000Z",
  });
  expect(await getEvent(event.id)).toEqual(event);
});

it.each([
  ["earlier", "2026-10-25T16:00:00-07:00"],
  ["equal", "2026-10-25T17:00:00-07:00"],
  ["equal with a different offset", "2026-10-26T00:00:00Z"],
  ["earlier despite a later calendar date", "2026-10-26T00:30:00+01:00"],
])("rejects an end time that is %s", async (_description, ends_at) => {
  const input = { ...validEvent, ends_at };
  await expect(createEvent(input)).rejects.toMatchObject({
    status: 400,
    message: "End time must be after start time.",
  });
  const response = await postEvent(eventRequest(input));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: "End time must be after start time.",
  });
  expect(await listEvents()).toEqual([]);
});

it.each([
  { event_type: undefined },
  { event_type: "   " },
  { event_type: "x".repeat(51) },
  { ends_at: undefined },
  { ends_at: null },
  { ends_at: "bad date" },
  { ends_at: "2026-10-26T01:00:00" },
  { starts_at: "bad date" },
])("rejects missing or malformed event fields: %j", async (invalidFields) => {
  const response = await postEvent(
    eventRequest({ ...validEvent, ...invalidFields }),
  );
  expect(response.status).toBe(400);
  expect(await listEvents()).toEqual([]);
});

it("keeps pre-migration events readable with a default type and no end time", async () => {
  const proxy = await getPlatformProxy<{
    DB: Database & { exec(sql: string): Promise<unknown> };
  }>({ persist: false });
  const originalDb = state.db;
  try {
    await applyMigrations(proxy.env.DB, migrations.slice(0, 1));
    const id = crypto.randomUUID();
    const legacy = await proxy.env.DB.prepare(
      "INSERT INTO attendance_events (id, name, starts_at, location) VALUES (?, ?, ?, ?) RETURNING *",
    )
      .bind(id, "Old meeting", "2026-10-26T00:00:00.000Z", "Engineering Hall")
      .first<Omit<AttendanceEvent, "event_type" | "ends_at">>();
    await applyMigrations(proxy.env.DB, migrations.slice(1));
    state.db = proxy.env.DB;
    const expected = { ...legacy, event_type: "other", ends_at: null };
    expect(await getEvent(id)).toEqual(expected);
    expect(await listEvents()).toEqual([expected]);
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-26T00:30:00Z"));
    await expect(
      checkIn(id, { name: "Jane", email: "jane@example.com" }),
    ).rejects.toMatchObject({ status: 409 });
  } finally {
    state.db = originalDb;
    await proxy.dispose();
  }
}, 30_000);

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
