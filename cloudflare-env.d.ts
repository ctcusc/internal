import type { Database } from "./src/server/data/db";

declare global {
  interface CloudflareEnv {
    DB: Database;
    LOGIN_RATE_LIMITER: {
      limit(options: { key: string }): Promise<{ success: boolean }>;
    };
    SITE_PASSWORD: string;
    SESSION_SECRET: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GOOGLE_REDIRECT_URI?: string;
    GOOGLE_ALLOWED_EMAILS?: string;
  }
}
