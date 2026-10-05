import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    // Builds need no secrets. Missing runtime secrets leave access disabled.
    SITE_PASSWORD: z.string().min(12).max(1024).optional(),
    SESSION_SECRET: z.string().min(32).optional(),
  },
  client: {},
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    SITE_PASSWORD: process.env.SITE_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
  },
  emptyStringAsUndefined: true,
});
