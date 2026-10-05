import localFont from "next/font/local";
import { LockKeyhole } from "lucide-react";

import { Brand, CtcMark } from "@/components/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordForm } from "./password-form";

const display = localFont({
  src: "../../fonts/Redaction50Regular.ttf",
  display: "swap",
});

export function Welcome({
  configured,
  returnTo,
}: {
  configured: boolean;
  returnTo: string;
}) {
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
          {configured ? (
            <PasswordForm returnTo={returnTo} />
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
