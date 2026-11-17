"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";

export function UrlShortener() {
  // Store the form input, request state, result, and feedback.
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [invalidInput, setInvalidInput] = useState(false);
  const [shortUrl, setShortUrl] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Handle submission without reloading the page.
    event.preventDefault();

    if (isLoading) return;

    setError("");
    setInvalidInput(false);
    setShortUrl("");
    setCopyMessage("");

    const destination = url.trim();

    // Match the API's destination URL requirements.
    try {
      const parsed = new URL(destination);

      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        destination.length > 2048
      ) {
        throw new Error("Invalid URL");
      }
    } catch {
      setInvalidInput(true);
      setError(
        "Enter a complete HTTP or HTTPS URL without a username or password. Maximum 2,048 characters.",
      );
      return;
    }

    setIsLoading(true);

    try {
      // Send the destination; the server generates the short code.
      const response = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: destination }),
      });

      // Avoid showing a JSON parsing error if the server returns HTML.
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "The link service returned an unexpected response. Please try again.",
        );
      }

      // Treat server data as unknown until its fields are checked.
      const data: unknown = await response.json();

      if (!response.ok) {
        const serverMessage =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Could not create your short link. Please try again.";

        throw new Error(serverMessage);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("link" in data) ||
        typeof data.link !== "object" ||
        data.link === null ||
        !("code" in data.link) ||
        typeof data.link.code !== "string" ||
        !/^[a-zA-Z0-9_-]{3,64}$/.test(data.link.code)
      ) {
        throw new Error("The server returned an unexpected response.");
      }

      // Match the redirect owner's agreed /go/[code] route.
      // Use the current domain for local, preview, and production links.
      const createdUrl = new URL(
        `/go/${encodeURIComponent(data.link.code)}`,
        window.location.origin,
      );

      setShortUrl(createdUrl.href);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not create your short link. Please try again.",
      );
    } finally {
      // Re-enable the form after either success or failure.
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    setCopyMessage("");

    try {
      // Copy the created short URL to the user's clipboard.
      await navigator.clipboard.writeText(shortUrl);
      setCopyMessage("Link copied.");
    } catch {
      setCopyMessage(
        "Could not copy automatically. Select the link and copy it manually.",
      );
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Enter a destination URL to create a short link.
      </p>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-busy={isLoading}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label
            htmlFor="destination-url"
            className="block text-sm font-medium"
          >
            Destination URL
          </label>

          <input
            id="destination-url"
            name="url"
            type="url"
            required
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);

              if (invalidInput) {
                setInvalidInput(false);
                setError("");
              }
            }}
            disabled={isLoading}
            placeholder="https://example.com"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={invalidInput}
            aria-describedby={
              invalidInput ? "destination-help link-error" : "destination-help"
            }
            className="border-border bg-background focus-visible:ring-ring w-full min-w-0 rounded-md border px-3 py-2 text-base focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
          />

          <p id="destination-help" className="text-muted-foreground text-sm">
            Include https:// or http://. Maximum 2,048 characters.
          </p>
        </div>

        {error ? (
          <p id="link-error" role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? "Creating…" : "Create short link"}
        </Button>
      </form>

      {/* Keep loading announcements outside the busy form. */}
      <p role="status" className="sr-only">
        {isLoading ? "Creating your short link." : ""}
      </p>

      {shortUrl ? (
        <section
          aria-label="Created link"
          className="border-border space-y-4 rounded-lg border p-4"
        >
          <p role="status">Short link created.</p>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">Your short URL</h2>

            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary block break-all underline underline-offset-4"
            >
              {shortUrl}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          <Button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto"
          >
            Copy short URL
          </Button>

          <p role="status" className="text-muted-foreground text-sm">
            {copyMessage}
          </p>

          {/* Pass shortUrl to the QR component when it is available. */}
          <div className="border-border rounded-md border border-dashed p-6">
            <p className="text-muted-foreground text-sm">
              QR preview will appear here.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
