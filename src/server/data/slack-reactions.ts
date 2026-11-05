import "server-only";

import { z } from "zod";
import { env } from "@/env";
import { getDatabase } from "./db";
import { authorize } from "./shared";

const reactionEventSchema = z.object({
  type: z.enum(["reaction_added", "reaction_removed"]),
  user: z.string().min(1),
  reaction: z.string().min(1),
  item: z.object({
    type: z.literal("message"),
    channel: z.string().min(1),
    ts: z.string().min(1),
  }),
});

// Called by the webhook after it verifies the Slack signature, so there is no
// club session to authorize. Events that do not apply are ignored.
export async function applySlackReactionEvent(event: unknown): Promise<void> {
  const parsed = reactionEventSchema.safeParse(event);
  if (!parsed.success) return;
  const { type, user, reaction, item } = parsed.data;
  if (
    item.channel !== env.SLACK_REACTION_CHANNEL_ID ||
    reaction !== env.SLACK_REACTION_EMOJI
  )
    return;

  const db = await getDatabase();
  const sql =
    type === "reaction_added"
      ? `INSERT INTO slack_reactions (channel_id, message_ts, user_id, emoji)
         VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING`
      : `DELETE FROM slack_reactions
         WHERE channel_id = ? AND message_ts = ? AND user_id = ? AND emoji = ?`;
  await db.prepare(sql).bind(item.channel, item.ts, user, reaction).first();
}

export async function getSlackReactionCount(): Promise<number> {
  await authorize();
  const channel = env.SLACK_REACTION_CHANNEL_ID;
  const emoji = env.SLACK_REACTION_EMOJI;
  if (!channel || !emoji) return 0;
  const db = await getDatabase();
  const row = await db
    .prepare(
      "SELECT COUNT(*) AS count FROM slack_reactions WHERE channel_id = ? AND emoji = ?",
    )
    .bind(channel, emoji)
    .first<{ count: number }>();
  return row?.count ?? 0;
}
