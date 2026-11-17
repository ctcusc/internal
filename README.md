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

## Google sign-in

The sign-in page shows **Sign in with Google** when `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_ALLOWED_EMAILS` are all set. `/api/auth/google/start` sends the member to Google; `/api/auth/google/callback` verifies the ID token and grants the normal club session only when the Google-verified email is in `GOOGLE_ALLOWED_EMAILS` (comma-separated, case-insensitive). Anyone else is refused. Password login is unchanged, and the club session still depends on `SITE_PASSWORD` and `SESSION_SECRET`.

The existing Google Cloud project is administered through a personal account; the intended long-term owner is the club's Google account. A Google OAuth test user is only allowed to test consent, and does not gain project administration access. The current project administrator should grant the club account the appropriate project access in Google Cloud IAM, have the club account accept the invitation and verify it can administer the OAuth client, and arrange access for another maintainer before removing the personal account. Record the project ID, client name, administrator accounts, and secure credential-storage location in the club's private maintainer records. The precise owner and storage location still need to be confirmed.

### Google Cloud configuration

1. In Google Auth Platform, select the correct project and configure Branding with the app name `CTC Internal`, support contact, and developer contact. Set Audience to External. While publishing status is Testing, add each Google account that will sign in as a test user, including the club account if it will be used for testing. Test-user status does not grant access to the project. Testing is limited to listed users and Google may display an unverified-app warning.
2. Use a **Web application** OAuth client. The currently supplied `https://www.ctcusc.com/` is the public homepage, not this app's callback. After the application implements a callback, register its exact production HTTPS URI under `https://internal.ctcusc.com` and its exact localhost HTTP URI, including port and path, under the client's **Authorized redirect URIs**. The implementation's configured `GOOGLE_REDIRECT_URI` must match the registered URI exactly. Do not use the public homepage as the callback unless the app actually handles the OAuth response there.
3. The implementation must request only `openid`, `email`, and `profile`; do not enable broad Google API scopes. Follow [Google's OpenID Connect guide](https://developers.google.com/identity/openid-connect/openid-connect) for the authorization code flow and validation.

### Credentials, deployment, and rotation

Never commit credentials or paste the client secret into issues, chat, or documentation. Use the club's approved private secret store once its location is confirmed. For local Next.js development, put the client values and the exact localhost callback URI in the ignored `.env.local`; for a local Cloudflare preview, use the ignored `.dev.vars` instead. The example files are intentionally blank.

Production gets `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from GitHub Actions secrets; the Deploy workflow uploads them to the Worker as Cloudflare secrets, like `SITE_PASSWORD`. `GOOGLE_REDIRECT_URI` is a plain variable in `wrangler.jsonc` set to `https://internal.ctcusc.com/api/auth/google/callback`. The member allowlist, `GOOGLE_ALLOWED_EMAILS` (comma-separated), lives only in Cloudflare: **Workers → ctc-internal → Settings → Variables and Secrets**, added with type **Secret** (a plain-text variable added in the dashboard is removed by the next deploy), or `pnpm exec wrangler secret put GOOGLE_ALLOWED_EMAILS --name ctc-internal`. Changes apply immediately; deploys keep the value. PR previews receive none of these values, so they show password sign-in only.

To rotate the secret, a project administrator creates or resets the client secret in Google Auth Platform, stores the new value in the club's private secret store, updates the GitHub Actions secret and any authorized local or direct-deployment configuration, and redeploys. Coordinate the change: resetting a secret can interrupt sign-in until the new value is deployed. Verify the production sign-in flow before retiring an old secret, if Google permits an overlap. If the client ID changes, update `GOOGLE_CLIENT_ID` as well and verify the registered redirect URIs.

### Testing after implementation

- Localhost: register the exact local callback, set the three Google values in `.env.local`, run `pnpm dev`, and sign in with an authorized test account. Confirm Google returns to the callback and the app creates a session. Repeat with `pnpm preview` and `.dev.vars` to exercise the Cloudflare Worker build, using the exact port and callback registered for that run.
- Production: deploy with the production secrets, sign in at `https://internal.ctcusc.com`, and confirm the registered production callback creates a session. Check an unauthorized account is rejected according to the app's access policy, which still needs to be implemented.
- PR previews: arbitrary `pr-<number>` or `workers.dev` URLs are not registered automatically and cannot be assumed to work with the production client. Use localhost or a deliberately configured stable test deployment and client; do not redirect a preview through the production callback as a workaround.

Neither the Google callback nor these tests can be verified until the sign-in integration is built and the project and deployment credentials are available.
