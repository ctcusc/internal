# CTC Internal

Internal tools for Code the Change at USC.

## Development

Use Node.js 24 and pnpm through Corepack.

```sh
nvm use
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set `SITE_PASSWORD` (12+ characters) and `SESSION_SECRET` (32+ characters) in `.env.local`. Generate a session secret with `openssl rand -hex 32`.

```sh
pnpm dev
```

## Commands

- `pnpm check` — formatting, lint, types, and tests
- `pnpm format:write` — format code
- `pnpm build` — production build
- `pnpm build:cloudflare` — Cloudflare Worker build

Deploy through the **Deploy** workflow in GitHub Actions.
