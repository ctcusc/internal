import { spawn } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const port = 8792;
const server = spawn(
  "pnpm",
  ["exec", "wrangler", "dev", "--local", "--port", String(port)],
  {
    stdio: "inherit",
    detached: true,
    env: {
      ...process.env,
      SITE_PASSWORD: "local-smoke-test-password",
      SESSION_SECRET: "local-smoke-test-secret-at-least-32-characters",
      WRANGLER_SEND_METRICS: "false",
    },
  },
);
/** @type {Error | undefined} */
let startupError;
server.on("error", (error) => {
  startupError = error;
});
try {
  let response;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (startupError) throw startupError;
    if (server.exitCode !== null)
      throw new Error("Worker exited before becoming ready.");
    try {
      response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(2000),
      });
      break;
    } catch {
      await setTimeout(1000);
    }
  }
  if (!response) throw new Error("Worker did not become ready.");
  if (response.status !== 200)
    throw new Error(
      `Homepage returned ${response.status}: ${await response.text()}`,
    );
  if (!(await response.text()).includes("<html"))
    throw new Error("Homepage did not return HTML.");
  for (const path of ["/api/links", "/api/events"]) {
    const result = await fetch(`http://127.0.0.1:${port}${path}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (result.status !== 401)
      throw new Error(
        `${path} returned ${result.status}; expected 401 without login.`,
      );
  }
  console.log(
    "Worker smoke test passed: homepage renders and API routes require login.",
  );
} finally {
  if (server.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ESRCH"
      )
        throw error;
    }
  }
}
