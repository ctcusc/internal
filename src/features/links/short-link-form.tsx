"use client";

import { useState, type ComponentType, type FormEvent } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ShortLink } from "@/server/data/links";

type CreateResult =
  | { status: "idle" | "pending" }
  | { status: "invalid" | "error"; message: string }
  | { status: "created"; shortUrl: string };

function ShortLinkResult({ shortUrl }: { shortUrl: string }) {
  const [copyMessage, setCopyMessage] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopyMessage("Link copied.");
    } catch {
      setCopyMessage("Select the short link and copy it manually.");
    }
  }

  return (
    <section
      aria-labelledby="short-link-heading"
      className="space-y-3 border-t pt-5"
    >
      <h2 id="short-link-heading" className="font-bold">
        Your short link
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={shortUrl}
          className="text-primary min-w-0 break-all underline underline-offset-4"
        >
          {shortUrl}
        </a>
        <Button type="button" variant="outline" onClick={copyLink}>
          <Copy aria-hidden="true" /> Copy link
        </Button>
      </div>
      <p role="status" className="text-muted-foreground text-sm empty:hidden">
        {copyMessage}
      </p>
    </section>
  );
}

export function ShortLinkForm({
  QrCode,
}: {
  QrCode?: ComponentType<{ shortUrl: string }>;
}) {
  const [result, setResult] = useState<CreateResult>({ status: "idle" });
  const pending = result.status === "pending";
  const invalid = result.status === "invalid";

  async function createShortLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const input = event.currentTarget.elements.namedItem(
      "destination",
    ) as HTMLInputElement;
    const url = input.value.trim();
    const destination = URL.parse(url);
    if (
      !destination ||
      !["http:", "https:"].includes(destination.protocol) ||
      destination.username ||
      destination.password ||
      url.length > 2048
    ) {
      setResult({
        status: "invalid",
        message:
          "Enter an HTTP or HTTPS URL up to 2,048 characters, without a username or password.",
      });
      input.focus();
      return;
    }

    setResult({ status: "pending" });
    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as {
        link?: ShortLink;
        error?: string;
      };
      if (!response.ok) {
        setResult({
          status: response.status === 400 ? "invalid" : "error",
          message: data.error ?? "Could not create the short link. Try again.",
        });
        return;
      }
      if (!data.link?.code) throw new Error("Missing short code");
      const shortUrl = new URL(
        `/s/${encodeURIComponent(data.link.code)}`,
        window.location.origin,
      ).href;
      setResult({ status: "created", shortUrl });
    } catch {
      setResult({
        status: "error",
        message: "Could not create the short link. Try again.",
      });
    }
  }

  return (
    <div className="bg-card space-y-6 rounded-lg border p-5 sm:p-6">
      <form
        onSubmit={createShortLink}
        noValidate
        aria-busy={pending}
        className="space-y-3"
      >
        <Label htmlFor="destination">Destination URL</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="destination"
            name="destination"
            type="url"
            required
            placeholder="https://example.com"
            autoCapitalize="none"
            spellCheck={false}
            readOnly={pending}
            aria-invalid={invalid}
            aria-describedby={invalid ? "create-error" : undefined}
            onChange={() => {
              if (result.status !== "idle") setResult({ status: "idle" });
            }}
            className="h-10"
          />
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create short link"}
          </Button>
        </div>
        {(result.status === "invalid" || result.status === "error") && (
          <p
            id="create-error"
            role="alert"
            className="text-destructive text-sm"
          >
            {result.message}
          </p>
        )}
      </form>
      <span role="status" className="sr-only">
        {pending
          ? "Creating short link."
          : result.status === "created"
            ? "Short link created."
            : ""}
      </span>
      {result.status === "created" && (
        <>
          <ShortLinkResult key={result.shortUrl} shortUrl={result.shortUrl} />
          {QrCode && <QrCode shortUrl={result.shortUrl} />}
        </>
      )}
    </div>
  );
}
