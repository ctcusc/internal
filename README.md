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

## Google sign-in

USC Google sign-in uses the OpenID Connect authorization-code flow with PKCE, state, and a nonce. The flow uses [`oauth4webapi`](https://github.com/panva/oauth4webapi), which is Worker-compatible. It checks the state (login CSRF), exchanges the code with the PKCE verifier, and validates the ID token (signature, issuer, audience, expiry, nonce). The server then accepts it only when `email_verified` is true, the email is `@usc.edu`, and the `hd` claim is `usc.edu`. The signed-in identity (Google account ID `sub`, name, email) is stored in an HTTP-only, eight-hour session cookie signed with `SESSION_SECRET`.

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from a Google OAuth web client whose authorized redirect URIs include `<origin>/api/auth/google/callback` for every origin that signs in (local: `http://localhost:3000`).

- `GET /api/auth/google?next=/path` starts sign-in; failures return to `/?error=google_sign_in_failed`.
- Server code calls `getIdentity()` or `requireIdentity(returnTo)` from `@/server/auth/server`.
- The club-password session is separate and is retired by the sign-in UI issue; it is never accepted as a Google identity.

## Commands

- `pnpm check` — formatting, lint, types, and tests
- `pnpm format:write` — format code
- `pnpm build` — production build
- `pnpm build:cloudflare` — Cloudflare Worker build

Pushes to `main`, including merged PRs, deploy to `internal.ctcusc.com` after checks pass. The **Deploy** workflow also supports manual runs.

## PR previews

Same-repo PRs build and deploy to `pr-<number>.internal.ctcusc.com` independently of CI checks. Find the preview in the PR's deployment status, updated bot comment, or **Preview** workflow summary. Closing the PR deletes its preview and marks its deployments inactive.

Production and previews share four GitHub Actions secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `SITE_PASSWORD` (12+ characters), and `SESSION_SECRET` (32+ characters). The first production deployment registers the custom domain for production and previews. Previews use `workers.dev` until the custom domain is active.

## Project data starter

D1 is bound as `DB` to `ctc-internal` (`dded22aa-c431-40e7-bae4-3d62f0540c16`).
This starter supplies storage and basic reads/writes. Developers implement the
short-code generation, redirect behavior, QR rendering, and attendance UI/workflows.
There is no public redirect or unauthenticated attendance endpoint.

### Database setup

```sh
pnpm db:migrate:local
pnpm dev
```

Local development uses a local D1 database, not production. To create the tables
in the existing remote database, authenticate Wrangler to its owning Cloudflare
account (set `CLOUDFLARE_ACCOUNT_ID` if necessary), then run:

```sh
pnpm db:migrate:remote
```

The production deployment workflow applies migrations before deploying, using the
existing Cloudflare account/token secrets. That token needs D1 edit access.
PR previews bind `DB` to the separate `ctc-internal-preview` D1 database. The
Preview workflow applies migrations there before deploying each PR. All PR
previews share this database, so use test data only; closing a PR does not delete
its rows. Production uses `ctc-internal` and is never a preview binding. To
apply preview migrations manually, use `pnpm db:migrate:preview` with credentials
for the CTC Cloudflare account.

### Tables

- `short_links`: `code` (primary key), `url`, optional `title`, `created_at`.
  A code must be supplied by the developer's app. QR codes can encode the eventual
  short URL; image generation and storage are left to the project.
- `attendance_events`: `id` (UUID), `name`, `starts_at` (UTC), optional `location`,
  `created_at`.
- `attendance_check_ins`: `event_id` (foreign key), `email`, `name`, `checked_in_at`.
  One row per event/email. Repeating a write updates the name and preserves the
  original timestamp. Email is normalized to lowercase.

### Endpoints

All endpoints require the existing club login cookie. They are intended for
same-origin pages in this app. All signed-in members share access; this is not
individual identity verification or per-role authorization.

| Method | Path                         | Read/write                            |
| ------ | ---------------------------- | ------------------------------------- |
| GET    | `/api/links`                 | List saved links                      |
| GET    | `/api/links/:code`           | Read one link                         |
| POST   | `/api/links`                 | Save `{ code, url, title? }`          |
| GET    | `/api/events`                | List events                           |
| GET    | `/api/events/:id`            | Read one event                        |
| POST   | `/api/events`                | Save `{ name, starts_at, location? }` |
| GET    | `/api/events/:id/attendance` | List check-ins                        |
| POST   | `/api/events/:id/attendance` | Save `{ name, email }`                |

List endpoints accept `?limit=50&offset=0` (maximum limit 100). Responses wrap
results in `links`, `link`, `events`, `event`, `attendance`, or `checkIn`.
Dates are ISO 8601 strings. Send writes as `application/json` (maximum 16 KiB).
Errors return `{ error: "..." }`: 400 invalid input, 401 sign-in required,
403 cross-origin write, 404 missing record, 409 duplicate code,
413 oversized body, 415 incorrect content type, or 503 unavailable database.

Example from a signed-in page:

```ts
const response = await fetch("/api/links", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: "workshop", url: "https://example.com" }),
});
if (!response.ok) throw new Error("Could not save link");
const { link } = await response.json();
```

Server components and server actions can call the same authenticated helpers:

```ts
import { createLink, getLink, listLinks } from "@/server/data/links";
import {
  createEvent,
  getEvent,
  listEvents,
  checkIn,
  listAttendance,
} from "@/server/data/attendance";
```

Keep these imports server-side. Validate project-specific rules in your own code;
the starter validates basic fields and uses parameterized SQL.
