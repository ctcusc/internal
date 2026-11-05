import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    // Optional during builds; required for sign-in.
    SITE_PASSWORD: z.string().min(12).max(1024).optional(),
    SESSION_SECRET: z.string().min(32).optional(),
    // Optional until the team selects the Slack channel and emoji to count.
    SLACK_REACTION_CHANNEL_ID: z.string().min(1).optional(),
    SLACK_REACTION_EMOJI: z.string().min(1).optional(),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SITE_PASSWORD: process.env.SITE_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SLACK_REACTION_CHANNEL_ID: process.env.SLACK_REACTION_CHANNEL_ID,
    SLACK_REACTION_EMOJI: process.env.SLACK_REACTION_EMOJI,
  },
  emptyStringAsUndefined: true,
});
