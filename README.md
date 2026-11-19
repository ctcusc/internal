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

## Slack reactions

`POST /api/slack/events` receives Slack Events API callbacks and counts one emoji
in one channel. It is authenticated by Slack's request signature (not the club
login). Only `reaction_added`/`reaction_removed` on messages in
`SLACK_REACTION_CHANNEL_ID` with `SLACK_REACTION_EMOJI` are passed to
`applySlackReactionEvent` (`src/server/data/slack-reactions.ts`); every other
verified event is acknowledged with 200 and ignored. Storage is idempotent, so
Slack retries are reapplied safely. A storage failure returns 500 so Slack
retries later.

| Variable                    | Example     | Notes                                           |
| --------------------------- | ----------- | ----------------------------------------------- |
| `SLACK_SIGNING_SECRET`      | (secret)    | Required; the route returns 503 without it.     |
| `SLACK_REACTION_CHANNEL_ID` | `C0123ABCD` | Channel ID, not name. Unset ignores all events. |
| `SLACK_REACTION_EMOJI`      | `tada`      | Short name without colons.                      |

### Slack app setup

1. At [api.slack.com/apps](https://api.slack.com/apps), choose **Create New App →
   From scratch** in the CTC workspace.
2. Under **OAuth & Permissions → Bot Token Scopes**, add `reactions:read`, then
   **Install to Workspace**. The route never calls Slack, so the bot token is not
   stored.
3. Set the Cloudflare configuration (production keeps these across deploys):

   ```sh
   pnpm exec wrangler secret put SLACK_SIGNING_SECRET      # Basic Information → App Credentials
   pnpm exec wrangler secret put SLACK_REACTION_CHANNEL_ID
   pnpm exec wrangler secret put SLACK_REACTION_EMOJI
   ```

4. Under **Event Subscriptions**, enable events and set the Request URL to
   `https://internal.ctcusc.com/api/slack/events`. Slack sends a
   `url_verification` challenge immediately, so the route and signing secret must
   already be deployed. Under **Subscribe to bot events**, add `reaction_added` and
   `reaction_removed`, save, and reinstall the app if prompted.
5. In the agreed channel, run `/invite @<app name>`. Bot events are only sent for
   channels the app is a member of. Copy the channel ID from the channel's
   details.

Reactions with skin tones arrive as names like `thumbsup::skin-tone-2` and do not
match the base emoji. Only reactions made after setup are counted.

### Testing locally

Put the three variables in `.env.local` (for `pnpm dev`) or `.dev.vars` (for
`pnpm preview`), then send a signed request:

```sh
body='{"type":"url_verification","challenge":"hello"}'
ts=$(date +%s)
sig="v0=$(printf 'v0:%s:%s' "$ts" "$body" | openssl dgst -sha256 -hmac "$SLACK_SIGNING_SECRET" | sed 's/^.* //')"
curl -i http://localhost:3000/api/slack/events \
  -H 'Content-Type: application/json' \
  -H "X-Slack-Request-Timestamp: $ts" -H "X-Slack-Signature: $sig" -d "$body"
```

To receive real events locally, expose the dev server with a tunnel (for example
`cloudflared tunnel --url http://localhost:3000`) and use that URL as a
temporary Request URL.
