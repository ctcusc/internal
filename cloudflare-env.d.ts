interface CloudflareEnv {
  LOGIN_RATE_LIMITER: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
  SITE_PASSWORD: string;
  SESSION_SECRET: string;
}
