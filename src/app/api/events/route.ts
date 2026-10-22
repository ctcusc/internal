import {
  createEvent,
  listEvents,
  type NewEvent,
} from "@/server/data/attendance";
import { authorize, pageFromRequest } from "@/server/data/shared";
import { dataError, json, readData } from "@/server/data/api-utils";

export async function GET(request: Request) {
  try {
    return json({ events: await listEvents(pageFromRequest(request)) });
  } catch (error) {
    return dataError(error);
  }
}
export async function POST(request: Request) {
  try {
    await authorize();
    return json(
      { event: await createEvent((await readData(request)) as NewEvent) },
      201,
    );
  } catch (error) {
    return dataError(error);
  }
}
