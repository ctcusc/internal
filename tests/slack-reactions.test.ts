import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { getPlatformProxy } from "wrangler";
import type { Database } from "@/server/data/db";
import {
  applySlackReactionEvent,
  getSlackReactionCount,
} from "@/server/data/slack-reactions";

const channel = "C123";
const emoji = "wave";
const config = vi.hoisted(() => ({
  SLACK_REACTION_CHANNEL_ID: "",
  SLACK_REACTION_EMOJI: "",
}));
vi.mock("@/env", () => ({ env: config }));
let signedIn: boolean;
vi.mock("@/server/auth/server", () => ({
  getClubSession: async () => (signedIn ? {} : null),
}));
let db: Database & { exec(sql: string): Promise<unknown> };
vi.mock("@/server/data/db", () => ({ getDatabase: async () => db }));
let dispose: () => Promise<void>;

beforeAll(async () => {
  const proxy = await getPlatformProxy<{ DB: typeof db }>({ persist: false });
  db = proxy.env.DB;
  dispose = proxy.dispose;
  for (const file of [
    "0001_links_and_attendance.sql",
    "0002_project_foundations.sql",
    "0003_slack_reaction_versions.sql",
  ]) {
    const sql = await readFile(
      new URL(`../migrations/${file}`, import.meta.url),
      "utf8",
    );
    await db.exec(sql.replace(/^--.*$/gm, "").replaceAll("\n", " "));
  }
}, 30_000);

afterAll(async () => {
  await dispose?.();
});
beforeEach(async () => {
  config.SLACK_REACTION_CHANNEL_ID = channel;
  config.SLACK_REACTION_EMOJI = emoji;
  signedIn = true;
  await db.exec(
    "DELETE FROM slack_reactions; DELETE FROM slack_reaction_versions;",
  );
});

const added = {
  type: "reaction_added",
  item: { type: "message", channel, ts: "1700000000.100000" },
  user: "U1",
  reaction: emoji,
  event_ts: "1700000001.000001",
};
const removed = {
  ...added,
  type: "reaction_removed",
  event_ts: "1700000001.000002",
};

it("counts distinct users and messages once and removes only the matching reaction", async () => {
  expect(await getSlackReactionCount()).toBe(0);
  await Promise.all([
    applySlackReactionEvent(added),
    applySlackReactionEvent(added),
    applySlackReactionEvent({ ...added, user: "U2" }),
    applySlackReactionEvent({
      ...added,
      item: { ...added.item, ts: "1700000000.200000" },
    }),
  ]);
  expect(await getSlackReactionCount()).toBe(3);
  await applySlackReactionEvent(removed);
  await applySlackReactionEvent(removed);
  expect(await getSlackReactionCount()).toBe(2);
});

it("keeps the latest state when an older add or removal arrives again", async () => {
  await applySlackReactionEvent(removed);
  await applySlackReactionEvent(added);
  expect(await getSlackReactionCount()).toBe(0);
  await applySlackReactionEvent({ ...added, event_ts: "1700000001.000003" });
  await applySlackReactionEvent(removed);
  expect(await getSlackReactionCount()).toBe(1);
});

it("ignores unrelated and malformed events without writing either table", async () => {
  for (const event of [
    { ...added, item: { ...added.item, channel: "C999" } },
    { ...added, reaction: "another" },
    { ...added, type: "message" },
    { ...added, item: { type: "file", file: "F1" } },
    { ...added, event_ts: "invalid" },
    null,
  ])
    await applySlackReactionEvent(event);
  expect(await getSlackReactionCount()).toBe(0);
  expect(
    await db.prepare("SELECT * FROM slack_reaction_versions").first(),
  ).toBeNull();
});

it("reads only the selected channel and emoji, including existing active rows", async () => {
  await db
    .prepare(
      "INSERT INTO slack_reactions (channel_id, message_ts, user_id, emoji) VALUES (?, ?, ?, ?)",
    )
    .bind(channel, added.item.ts, added.user, emoji)
    .first();
  expect(await getSlackReactionCount()).toBe(1);
  config.SLACK_REACTION_CHANNEL_ID = "C999";
  expect(await getSlackReactionCount()).toBe(0);
  config.SLACK_REACTION_CHANNEL_ID = channel;
  config.SLACK_REACTION_EMOJI = "another";
  expect(await getSlackReactionCount()).toBe(0);
  config.SLACK_REACTION_EMOJI = emoji;
  await applySlackReactionEvent(removed);
  expect(await getSlackReactionCount()).toBe(0);
});

it("accepts webhook writes without a club session and authorizes the count reader", async () => {
  signedIn = false;
  await applySlackReactionEvent(added);
  await expect(getSlackReactionCount()).rejects.toMatchObject({ status: 401 });
  signedIn = true;
  expect(await getSlackReactionCount()).toBe(1);
});

it("reports an unconfigured count as unavailable and ignores writes", async () => {
  config.SLACK_REACTION_CHANNEL_ID = "";
  await applySlackReactionEvent(added);
  await expect(getSlackReactionCount()).rejects.toMatchObject({ status: 503 });
  config.SLACK_REACTION_CHANNEL_ID = channel;
  expect(await getSlackReactionCount()).toBe(0);
});
