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

Deploy to `internal.ctcusc.com` through the **Deploy** workflow in GitHub Actions.

## PR previews

Same-repo PRs build and deploy to `pr-<number>.internal.ctcusc.com` independently of CI checks. The preview URL appears in the **Deploy** workflow summary. Closing the PR deletes its preview.

Production and previews share four GitHub Actions secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SITE_PASSWORD` (12+ characters), and `SESSION_SECRET` (32+ characters). Deploy production once to register the custom domain for production and previews. Previews use `workers.dev` until the custom domain is active.
