import { createLink, listLinks, type NewLink } from "@/server/data/links";
import { authorize, pageFromRequest } from "@/server/data/shared";
import { dataError, json, readData } from "@/server/data/api-utils";

export async function GET(request: Request) {
  try {
    return json({ links: await listLinks(pageFromRequest(request)) });
  } catch (error) {
    return dataError(error);
  }
}
export async function POST(request: Request) {
  try {
    await authorize();
    return json(
      { link: await createLink((await readData(request)) as NewLink) },
      201,
    );
  } catch (error) {
    return dataError(error);
  }
}
