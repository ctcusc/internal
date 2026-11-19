import { dataError } from "@/server/data/api-utils";
import { getPublicLinkDestination } from "@/server/data/links";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const destination = await getPublicLinkDestination(code);
    if (destination === null) {
      return new Response(
        "Short link not found. Check the address and try again.",
        {
          status: 404,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    return Response.redirect(destination, 302);
  } catch (error) {
    return dataError(error);
  }
}
