import { getEvent } from "@/server/data/attendance";
import { dataError, json } from "@/server/data/api-utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const event = await getEvent(id);
    return event ? json({ event }) : json({ error: "Event not found." }, 404);
  } catch (error) {
    return dataError(error);
  }
}
