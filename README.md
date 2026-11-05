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

## Google sign-in setup (pending implementation)

The app currently uses a shared password. It does not yet have a Google sign-in button or callback route, so registering a Google client alone cannot enable sign-in. `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` in the environment examples and typed environment are reserved for that integration; they are not currently consumed or deployed. Do not remove the existing password secrets until a replacement is implemented and tested.

The existing Google Cloud project is administered through a personal account; the intended long-term owner is the club's Google account. A Google OAuth test user is only allowed to test consent, and does not gain project administration access. The current project administrator should grant the club account the appropriate project access in Google Cloud IAM, have the club account accept the invitation and verify it can administer the OAuth client, and arrange access for another maintainer before removing the personal account. Record the project ID, client name, administrator accounts, and secure credential-storage location in the club's private maintainer records. The precise owner and storage location still need to be confirmed.

### Google Cloud configuration

1. In Google Auth Platform, select the correct project and configure Branding with the app name `CTC Internal`, support contact, and developer contact. Set Audience to External. While publishing status is Testing, add each Google account that will sign in as a test user, including the club account if it will be used for testing. Test-user status does not grant access to the project. Testing is limited to listed users and Google may display an unverified-app warning.
2. Use a **Web application** OAuth client. The currently supplied `https://www.ctcusc.com/` is the public homepage, not this app's callback. After the application implements a callback, register its exact production HTTPS URI under `https://internal.ctcusc.com` and its exact localhost HTTP URI, including port and path, under the client's **Authorized redirect URIs**. The implementation's configured `GOOGLE_REDIRECT_URI` must match the registered URI exactly. Do not use the public homepage as the callback unless the app actually handles the OAuth response there.
3. The implementation must request only `openid`, `email`, and `profile`; do not enable broad Google API scopes. Follow [Google's OpenID Connect guide](https://developers.google.com/identity/openid-connect/openid-connect) for the authorization code flow and validation.

### Credentials, deployment, and rotation

Never commit credentials or paste the client secret into issues, chat, or documentation. Use the club's approved private secret store once its location is confirmed. For local Next.js development, put the client values and the exact localhost callback URI in the ignored `.env.local`; for a local Cloudflare preview, use the ignored `.dev.vars` instead. The example files are intentionally blank.

Production deployments currently receive secrets from GitHub Actions, not from the example files. When the callback integration is ready, a maintainer must add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the production `GOOGLE_REDIRECT_URI` to the repository's GitHub Actions secrets and update the Deploy workflow to pass them to the Worker through `cloudflare/wrangler-action`'s `secrets` list and `env`, as it already does for the password secrets. Configure any direct Wrangler deployments separately with `pnpm exec wrangler secret put` for each variable. Do not pass the production client secret to arbitrary PR previews. The production workflow currently does not provision these Google values.

To rotate the secret, a project administrator creates or resets the client secret in Google Auth Platform, stores the new value in the club's private secret store, updates the GitHub Actions secret and any authorized local or direct-deployment configuration, and redeploys. Coordinate the change: resetting a secret can interrupt sign-in until the new value is deployed. Verify the production sign-in flow before retiring an old secret, if Google permits an overlap. If the client ID changes, update `GOOGLE_CLIENT_ID` as well and verify the registered redirect URIs.

### Testing after implementation

- Localhost: register the exact local callback, set the three Google values in `.env.local`, run `pnpm dev`, and sign in with an authorized test account. Confirm Google returns to the callback and the app creates a session. Repeat with `pnpm preview` and `.dev.vars` to exercise the Cloudflare Worker build, using the exact port and callback registered for that run.
- Production: deploy with the production secrets, sign in at `https://internal.ctcusc.com`, and confirm the registered production callback creates a session. Check an unauthorized account is rejected according to the app's access policy, which still needs to be implemented.
- PR previews: arbitrary `pr-<number>` or `workers.dev` URLs are not registered automatically and cannot be assumed to work with the production client. Use localhost or a deliberately configured stable test deployment and client; do not redirect a preview through the production callback as a workaround.

Neither the Google callback nor these tests can be verified until the sign-in integration is built and the project and deployment credentials are available.
