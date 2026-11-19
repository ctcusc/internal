import "server-only";

import { z } from "zod";
import { env } from "@/env";
import { getDatabase } from "./db";
import { authorize, DataError } from "./shared";

const slackTimestamp = z.string().regex(/^\d{1,12}\.\d{6}$/);
const reactionEvent = z.object({
  type: z.enum(["reaction_added", "reaction_removed"]),
  user: z.string().min(1),
  reaction: z.string().min(1),
  item: z.object({
    type: z.literal("message"),
    channel: z.string().min(1),
    ts: slackTimestamp,
  }),
  event_ts: slackTimestamp,
});

const key = "(channel_id, message_ts, user_id, emoji)";
const matchesKey = `${key} = (?1, ?2, ?3, ?4)`;
const isNewEvent = `NOT EXISTS (
  SELECT 1 FROM slack_reaction_versions WHERE ${matchesKey} AND last_event_us >= ?5
)`;

/** Pass the inner Slack event after the webhook has verified its signature. */
export async function applySlackReactionEvent(event: unknown): Promise<void> {
  const parsed = reactionEvent.safeParse(event);
  if (!parsed.success) return;
  const { type, user, reaction, item, event_ts } = parsed.data;
  if (
    item.channel !== env.SLACK_REACTION_CHANNEL_ID ||
    reaction !== env.SLACK_REACTION_EMOJI
  )
    return;

  // Bind integer microseconds as decimal text to preserve Slack's precision.
  const values = [
    item.channel,
    item.ts,
    user,
    reaction,
    event_ts.replace(".", ""),
  ];
  const db = await getDatabase();
  const change =
    type === "reaction_added"
      ? `INSERT INTO slack_reactions ${key}
       SELECT ?1, ?2, ?3, ?4 WHERE ${isNewEvent} ON CONFLICT ${key} DO NOTHING`
      : `DELETE FROM slack_reactions WHERE ${matchesKey} AND ${isNewEvent}`;

  await db.batch([
    db.prepare(change).bind(...values),
    db
      .prepare(
        `
      INSERT INTO slack_reaction_versions (channel_id, message_ts, user_id, emoji, last_event_us)
      VALUES (?1, ?2, ?3, ?4, ?5)
      ON CONFLICT ${key} DO UPDATE SET last_event_us = excluded.last_event_us
      WHERE excluded.last_event_us > slack_reaction_versions.last_event_us
    `,
      )
      .bind(...values),
  ]);
}

export async function getSlackReactionCount(): Promise<number> {
  await authorize();
  const channel = env.SLACK_REACTION_CHANNEL_ID;
  const emoji = env.SLACK_REACTION_EMOJI;
  if (!channel || !emoji) {
    throw new DataError(503, "Slack reaction tracking is not configured.");
  }
  const db = await getDatabase();
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS count FROM slack_reactions WHERE channel_id = ? AND emoji = ?",
    )
    .bind(channel, emoji)
    .first<{ count: number }>();
  if (!row) throw new DataError(503, "Slack reaction count is unavailable.");
  return row.count;
}
