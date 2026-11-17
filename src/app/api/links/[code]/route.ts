import { getLink } from "@/server/data/links";
import { dataError, json } from "@/server/data/api-utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const link = await getLink(code);
    return link ? json({ link }) : json({ error: "Link not found." }, 404);
  } catch (error) {
    return dataError(error);
  }
}
