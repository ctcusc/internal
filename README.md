# CTC Internal

The shared workspace for Code the Change at USC. One Next.js app hosts the dashboard and club tools, with shared-password access, a responsive shadcn/ui shell, and a tool registry. Member flashcards has a sample card with photo/name placeholders and a reveal toggle. No database, roster, or learning progress is implemented.

## Local development

Use Node.js 24 (`nvm use`) and the pinned pnpm version. If your shell has another pnpm version, use `corepack pnpm` or enable Corepack first.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
openssl rand -hex 32
```

Set `SITE_PASSWORD` (at least 12 characters) and a separate `SESSION_SECRET` (at least 32 characters) in `.env.local`. Use the generated value for the session secret. Then run `pnpm dev`.

Both the password screen and dashboard live at `/`. Missing secrets show an unavailable-access state; there is no fallback password or development authentication bypass. Builds and CI need no authentication secrets.

## Commands

| Command                 | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `pnpm dev`              | Local Next.js development server                      |
| `pnpm check`            | Formatting, lint, types, and authentication tests     |
| `pnpm format:write`     | Format source and configuration                       |
| `pnpm build`            | Standard Next.js production build                     |
| `pnpm build:cloudflare` | Build the Cloudflare Worker through OpenNext          |
| `pnpm preview`          | Build and run the production Worker locally           |
| `pnpm deploy`           | Build and deploy to the configured Cloudflare account |

## Structure

- `src/app`: routes and loading/error states. The root route chooses password entry or dashboard based on the session.
- `src/components/ui`: shadcn/ui component source.
- `src/components/dashboard`: shared shell, navigation, and tool cards.
- `src/config/tools.ts`: typed tool metadata and availability.
- `src/server/auth`: server-only password verification, sessions, authorization, and rate limiting.
- `src/styles/globals.css`: CTC theme tokens.
- `src/features/member-flashcards`: the sample flashcard; future tools get their own feature folders.

The interface uses CTC's logo and local Alte Haas fonts, shared with the public website. See `src/fonts/README.md` for attribution.

## Authentication

The shared password grants club-level access, not a verified individual identity. There are no accounts, member IDs, or admin roles yet.

A successful sign-in creates an eight-hour, signed session in a host-only, HttpOnly, SameSite cookie; the cookie is Secure in production. The token is signed with a server-only key derived from both secrets. Changing either `SITE_PASSWORD` or `SESSION_SECRET` invalidates existing sessions on their next protected request. Sign-out clears the browser cookie. A copied token remains valid until it expires or a secret rotates; there is no server-side session database.

The root page reads the session before rendering dashboard content and is always dynamically rendered. Every future protected page, data read, route handler, or mutation must independently authorize its request. Navigation visibility and layout checks are not sufficient.

Cloudflare's `LOGIN_RATE_LIMITER` binding allows 10 attempts per minute per client IP, enforced at each Cloudflare location. Production sign-in fails closed if the binding or trusted client IP is unavailable. Local `next dev` uses a process-local limit for development only. Test production behavior with `pnpm preview`, not `next start`.

For password rotation, update the secret in the deployed environment and the GitHub production environment used for later deployments. Rotate `SESSION_SECRET` when all sessions should be invalidated independently of the password.

## Adding a tool

1. Create its route under `src/app/<slug>/page.tsx` and its feature code under `src/features/<slug>`. Member flashcards lives at `/flashcards`.
2. Call `requireClubSession('/<slug>')` before reading or rendering protected information. This redirects visitors to `/?next=...` and restores the destination after sign-in.
3. Wrap the route content in `DashboardShell`, providing a page title. Keep authentication checks close to protected operations, including Server Actions.
4. Add an entry to `src/config/tools.ts`. Available tools require an internal URL starting with `/`. Coming-soon tools have no URL. Navigation and the homepage use this registry.
5. Reuse shadcn components and CTC theme tokens. Add components with `pnpm exec shadcn add <component>`.
6. Add tool-specific storage only when needed. A first name-learning version can use repo-managed names/photos and browser-local progress; an in-app roster editor or cross-device progress would require revisiting persistence and identity.

Example page:

```tsx
import { DashboardShell } from "@/components/dashboard/shell";
import { requireClubSession } from "@/server/auth/server";

export default async function ExampleTool() {
  await requireClubSession("/example");
  return (
    <DashboardShell title="Example">
      <p>Tool content</p>
    </DashboardShell>
  );
}
```

`requireClubSession` redirects for page/Server Action flows. For a JSON API, call `getClubSession` and return a 401 response if absent. Avoid public/shared caching of protected responses and never put private roster data in public assets.

## Cloudflare preview and deployment

The Worker is named `ctc-internal`. It uses the same OpenNext deployment approach as the recruitment dashboard. No database or external auth service is required.

For a local Worker preview, copy `.dev.vars.example` to `.dev.vars`, set the two secrets, and run `pnpm preview`. Keep `.env.local` and `.dev.vars` local; both are ignored by Git. Development and deployed environments should use different secrets.

Pull requests and pushes to `main` run checks, a Worker build, and a deployment dry run. Deployment is deliberately a separate, manually triggered **Deploy** workflow on `main`.

Configure the GitHub `production` environment with:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` with permission to deploy the Worker
- `SITE_PASSWORD`
- `SESSION_SECRET`

The workflow uploads the authentication secrets when deploying. For a manual deployment, authenticate Wrangler, set the two secrets with `pnpm exec wrangler secret put <NAME>`, then run `pnpm deploy`.

`wrangler.jsonc` initially targets the account's Workers subdomain. To use `internal.ctcusc.com`, add a custom-domain route after confirming ownership and the desired hostname. Keep the `LOGIN_RATE_LIMITER` namespace unique within the account. No production deployment or domain provisioning is performed by scaffolding this repository.

## Verification

The automated tests cover session signatures and expiry, secret rotation, exact password matching, safe redirects, authorization guards, sign-in failure cases, rate-limit decisions, and sign-out. Before deploying, also check real browser sign-in/sign-out, mobile navigation, keyboard focus, and the Worker preview with its real rate-limit binding.
