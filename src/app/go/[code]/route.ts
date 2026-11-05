import { findRedirect } from "@/server/data/links";

const noStore = { "Cache-Control": "no-store" };
const plainText = { ...noStore, "Content-Type": "text/plain; charset=utf-8" };

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  try {
    const url = await findRedirect(code);
    if (url)
      return new Response(null, {
        status: 302,
        headers: { ...noStore, Location: url },
      });
    return new Response(
      "Short link not found. Check the link or ask whoever shared it.",
      { status: 404, headers: plainText },
    );
  } catch {
    console.error("Short link lookup failed.");
    return new Response("Short links are temporarily unavailable.", {
      status: 503,
      headers: plainText,
    });
  }
}
