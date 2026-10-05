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

Pushes to `main`, including merged PRs, deploy to `internal.ctcusc.com` after checks pass. The **Deploy** workflow also supports manual runs.

## PR previews

Same-repo PRs build and deploy to `pr-<number>.internal.ctcusc.com` independently of CI checks. A bot comment links to the preview and updates after each deployment. The URL also appears in the **Deploy** workflow summary. Closing the PR deletes its preview.

Production and previews share four GitHub Actions secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SITE_PASSWORD` (12+ characters), and `SESSION_SECRET` (32+ characters). The first production deployment registers the custom domain for production and previews. Previews use `workers.dev` until the custom domain is active.
