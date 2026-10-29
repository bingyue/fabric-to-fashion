import { after, NextResponse } from "next/server";
import { z } from "zod";
import { workspace, getSettings } from "@/lib/server/store";
import { startTask, recoverProject } from "@/lib/server/jobs";
import {
  checkOrigin,
  errorResponse,
  jsonBody,
  rateLimit,
} from "@/lib/server/http";
export const runtime = "nodejs";
export const maxDuration = 1800;
const schema = z.object({
  lookId: z.string().uuid().optional(),
  instruction: z.string().max(2000).optional(),
  retry: z.boolean().optional(),
});
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(r);
    const data = schema.parse(await jsonBody(r));
    const w = await workspace(),
      { id } = await c.params;
    rateLimit(`${w}:generate`, 10);
    await recoverProject(w, id);
    const task = await startTask(
      w,
      id,
      await getSettings(w),
      data.lookId,
      data.instruction,
      data.retry,
    );
    after(task.run);
    return NextResponse.json(task.project, { status: 202 });
  } catch (e) {
    return errorResponse(e);
  }
}
