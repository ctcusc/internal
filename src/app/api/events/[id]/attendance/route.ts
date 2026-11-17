import {
  checkIn,
  listAttendance,
  type Attendee,
} from "@/server/data/attendance";
import { authorize, pageFromRequest } from "@/server/data/shared";
import { dataError, json, readData } from "@/server/data/api-utils";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return json({
      attendance: await listAttendance(id, pageFromRequest(request)),
    });
  } catch (error) {
    return dataError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    await authorize();
    const { id } = await context.params;
    return json({
      checkIn: await checkIn(id, (await readData(request)) as Attendee),
    });
  } catch (error) {
    return dataError(error);
  }
}
