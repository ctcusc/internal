import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/server/auth/actions";
import { Navigation } from "./navigation";

export function DashboardShell({
  children,
  title,
  backLink,
  contentClassName,
}: {
  children: React.ReactNode;
  title: string;
  backLink?: { href: string; label: string };
  contentClassName?: string;
}) {
  return (
    <div className="min-h-svh">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6 sm:px-8">
          <Link href="/" aria-label="CTC Internal home">
            <Brand />
          </Link>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="text-muted-foreground h-10 text-sm"
            >
              Sign out
            </Button>
          </form>
        </div>
        <Navigation />
      </header>
      <main
        id="main-content"
        className={cn(
          "mx-auto max-w-4xl px-6 py-10 sm:px-8 sm:py-12",
          contentClassName,
        )}
      >
        <div className="mb-6 flex items-center gap-3">
          {backLink ? (
            <Button asChild variant="ghost" className="-ml-2 size-9 p-0">
              <Link href={backLink.href} aria-label={backLink.label}>
                <ArrowLeft className="size-5" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        {children}
      </main>
    </div>
  );
}
