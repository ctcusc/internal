import localFont from "next/font/local";
import { LockKeyhole } from "lucide-react";

import { Brand, CtcMark } from "@/components/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordForm } from "./password-form";

const googleErrors: Record<string, string> = {
  denied: "That Google account isn't on the member list.",
  failed: "Google sign-in failed. Try again.",
  unavailable: "Google sign-in unavailable.",
};

const display = localFont({
  src: "../../fonts/Redaction50Regular.ttf",
  display: "swap",
});

export function Welcome({
  configured,
  googleEnabled,
  googleError,
  returnTo,
}: {
  configured: boolean;
  googleEnabled: boolean;
  googleError?: string;
  returnTo: string;
}) {
  const googleMessage = googleError ? googleErrors[googleError] : undefined;
  return (
    <main
      id="main-content"
      className="min-h-svh bg-[#f7f9f6] md:grid md:grid-cols-2"
    >
      <div className="bg-primary text-primary-foreground relative isolate flex min-h-72 flex-col overflow-hidden px-8 py-8 sm:px-12 md:min-h-svh md:p-12 lg:p-16">
        <Brand className="[&_svg]:text-current" />
        <div className="flex flex-1 items-center py-12 md:py-20">
          <h1
            className={`${display.className} relative z-10 text-5xl leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl`}
          >
            Code the
            <br />
            Change.
          </h1>
        </div>
        <CtcMark className="pointer-events-none absolute -right-24 -bottom-12 -z-10 w-96 -rotate-12 opacity-[0.05] md:-right-32 md:-bottom-16 md:w-[34rem]" />
      </div>
      <div className="flex items-center justify-center px-8 py-12 sm:px-12 md:py-20">
        <div className="w-full max-w-sm">
          <div className="border-border bg-card text-primary mb-8 flex size-11 items-center justify-center rounded-2xl border">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </div>
          <h2 className="mb-8 text-3xl font-bold tracking-tight">Sign in</h2>
          {googleMessage ? (
            <Alert variant="destructive" role="alert" className="mb-4">
              <AlertDescription>{googleMessage}</AlertDescription>
            </Alert>
          ) : null}
          {configured ? (
            <>
              <PasswordForm returnTo={returnTo} />
              {googleEnabled ? (
                <>
                  <div className="text-muted-foreground my-6 flex items-center gap-3 text-xs uppercase">
                    <span className="bg-border h-px flex-1" />
                    or
                    <span className="bg-border h-px flex-1" />
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="bg-card w-full"
                  >
                    <a
                      href={`/api/auth/google/start?next=${encodeURIComponent(returnTo)}`}
                    >
                      <GoogleMark />
                      Sign in with Google
                    </a>
                  </Button>
                </>
              ) : null}
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Sign-in unavailable. Contact a board member.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}
