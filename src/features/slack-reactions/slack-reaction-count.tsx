import "server-only";

import { env } from "@/env";
import { getSlackReactionCount } from "@/server/data/slack-reactions";

import { ReactionCountCard } from "./reaction-count-card";

export async function SlackReactionCount() {
  // null means unavailable; zero is a valid count.
  let count: number | null = null;

  const channel = env.SLACK_REACTION_CHANNEL_ID;
  const emoji = env.SLACK_REACTION_EMOJI;

  // Avoid treating missing configuration as a real zero count.
  if (channel && emoji) {
    try {
      count = await getSlackReactionCount();
    } catch {
      // Keep the page usable if the database cannot be read.
      count = null;
    }
  }

  // Use the configured emoji name with thumbs up label
  const emojiLabel =
    emoji === "+1" || emoji === "thumbsup"
      ? "👍"
      : emoji
        ? `:${emoji}:`
        : "Selected emoji";

  return (
    <ReactionCountCard
      channelName="#spotted"
      emojiName={emojiLabel}
      count={count}
    />
  );
}
