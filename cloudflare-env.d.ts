import type { Database } from "./src/server/data/db";

declare global {
  interface CloudflareEnv {
    DB: Database;
    LOGIN_RATE_LIMITER: {
      limit(options: { key: string }): Promise<{ success: boolean }>;
    };
    SITE_PASSWORD: string;
    SESSION_SECRET: string;
    SLACK_REACTION_CHANNEL_ID?: string;
    SLACK_REACTION_EMOJI?: string;
    SLACK_SIGNING_SECRET?: string;
  }
}
