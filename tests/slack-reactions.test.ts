import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import type { Database } from "@/server/data/db";
import {
  applySlackReactionEvent,
  getSlackReactionCount,
} from "@/server/data/slack-reactions";

const state = vi.hoisted(() => {
  const env: {
    SLACK_REACTION_CHANNEL_ID?: string;
    SLACK_REACTION_EMOJI?: string;
  } = {};
  return { signedIn: true, db: null as Database | null, env };
});
vi.mock("@/env", () => ({ env: state.env }));
vi.mock("@/server/auth/server", () => ({
  getClubSession: async () => (state.signedIn ? {} : null),
}));
vi.mock("@/server/data/db", () => ({ getDatabase: async () => state.db }));
let dispose: () => Promise<void>;

const reaction = (overrides: Record<string, unknown> = {}) => ({
  type: "reaction_added",
  user: "U1",
  reaction: "tada",
  item: { type: "message", channel: "C1", ts: "1700000000.000100" },
  item_user: "U9",
  event_ts: "1700000001.000200",
  ...overrides,
});
const removal = (overrides: Record<string, unknown> = {}) =>
  reaction({ type: "reaction_removed", ...overrides });

beforeAll(async () => {
  const proxy = await getPlatformProxy<{
    DB: Database & { exec(sql: string): Promise<unknown> };
  }>({ persist: false });
  dispose = proxy.dispose;
  state.db = proxy.env.DB;
  for (const file of [
    "0001_links_and_attendance.sql",
    "0002_project_foundations.sql",
  ]) {
    const migration = await readFile(
      new URL(`../migrations/${file}`, import.meta.url),
      "utf8",
    );
    // exec() runs one statement per line, and flattening needs comments gone.
    await proxy.env.DB.exec(
      migration.replace(/^--.*$/gm, "").replaceAll("\n", " "),
    );
  }
}, 30_000);
afterAll(async () => {
  await dispose?.();
});
beforeEach(async () => {
  state.signedIn = true;
  state.env.SLACK_REACTION_CHANNEL_ID = "C1";
  state.env.SLACK_REACTION_EMOJI = "tada";
  await state.db!.prepare("DELETE FROM slack_reactions").bind().first();
});

it("records an added reaction", async () => {
  await applySlackReactionEvent(reaction());
  expect(await getSlackReactionCount()).toBe(1);
});
it("does not change the count on duplicate deliveries", async () => {
  await applySlackReactionEvent(reaction());
  await applySlackReactionEvent(reaction());
  expect(await getSlackReactionCount()).toBe(1);
});
it("removes a reaction", async () => {
  await applySlackReactionEvent(reaction());
  await applySlackReactionEvent(removal());
  expect(await getSlackReactionCount()).toBe(0);
});
it("ignores duplicate and unknown removals", async () => {
  await applySlackReactionEvent(reaction());
  await applySlackReactionEvent(removal({ user: "U2" }));
  expect(await getSlackReactionCount()).toBe(1);
  await applySlackReactionEvent(removal());
  await applySlackReactionEvent(removal());
  expect(await getSlackReactionCount()).toBe(0);
});
it("counts each user and message separately", async () => {
  await applySlackReactionEvent(reaction());
  await applySlackReactionEvent(reaction({ user: "U2" }));
  await applySlackReactionEvent(
    reaction({ item: { type: "message", channel: "C1", ts: "1700000002.0" } }),
  );
  expect(await getSlackReactionCount()).toBe(3);
});
it.each([
  [
    "another channel",
    reaction({ item: { type: "message", channel: "C2", ts: "1.0" } }),
  ],
  ["another emoji", reaction({ reaction: "wave" })],
  ["another event type", reaction({ type: "message" })],
  [
    "a non-message item",
    reaction({ item: { type: "file", file: "F1", channel: "C1", ts: "1.0" } }),
  ],
  ["a malformed event", { type: "reaction_added" }],
  ["a non-object event", null],
])("ignores %s", async (_name, event) => {
  await applySlackReactionEvent(event);
  const { results } = await state
    .db!.prepare("SELECT * FROM slack_reactions")
    .bind()
    .all();
  expect(results).toEqual([]);
});
it("stores only the reaction identity", async () => {
  await applySlackReactionEvent(
    reaction({ text: "secret message", item_user: "U9" }),
  );
  const { results } = await state
    .db!.prepare(
      "SELECT channel_id, message_ts, user_id, emoji FROM slack_reactions",
    )
    .bind()
    .all();
  expect(results).toEqual([
    {
      channel_id: "C1",
      message_ts: "1700000000.000100",
      user_id: "U1",
      emoji: "tada",
    },
  ]);
  const { results: columns } = await state
    .db!.prepare("SELECT name FROM pragma_table_info('slack_reactions')")
    .bind()
    .all<{ name: string }>();
  expect(columns.map(({ name }) => name).sort()).toEqual([
    "channel_id",
    "created_at",
    "emoji",
    "message_ts",
    "user_id",
  ]);
});
it("records events without a session but requires one to read the count", async () => {
  state.signedIn = false;
  await applySlackReactionEvent(reaction());
  await expect(getSlackReactionCount()).rejects.toMatchObject({ status: 401 });
  state.signedIn = true;
  expect(await getSlackReactionCount()).toBe(1);
});
it("ignores events and counts zero until configured", async () => {
  state.env.SLACK_REACTION_CHANNEL_ID = undefined;
  state.env.SLACK_REACTION_EMOJI = undefined;
  await applySlackReactionEvent(reaction());
  expect(await getSlackReactionCount()).toBe(0);
  const { results } = await state
    .db!.prepare("SELECT * FROM slack_reactions")
    .bind()
    .all();
  expect(results).toEqual([]);
});
