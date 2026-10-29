import { NextResponse } from "next/server";
import { z } from "zod";
import { workspace, mutateProject, deleteProject } from "@/lib/server/store";
import { recoverProject } from "@/lib/server/jobs";
import { checkOrigin, errorResponse, jsonBody } from "@/lib/server/http";
import { analysisSchema, designSchema } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, c: Context) {
  try {
    return NextResponse.json(
      await recoverProject(await workspace(), (await c.params).id),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  config: designSchema.optional(),
  analysis: analysisSchema.optional(),
  favorite: z.boolean().optional(),
  removeAsset: z.string().optional(),
  look: z
    .object({
      id: z.string(),
      name: z.string().min(1).max(80),
      description: z.string().min(1).max(700),
    })
    .optional(),
});
export async function PATCH(r: Request, c: Context) {
  try {
    checkOrigin(r);
    const data = patchSchema.parse(await jsonBody(r));
    const p = await mutateProject(
      await workspace(),
      (await c.params).id,
      (p) => {
        if (p.task?.status === "running")
          throw new Error("生成过程中暂时不能修改项目");
        if (data.name) p.name = data.name;
        if (data.config) p.config = data.config;
        if (data.analysis) p.analysis = { ...data.analysis, source: "manual" };
        if (data.favorite !== undefined) p.favorite = data.favorite;
        if (data.removeAsset) {
          p.assets = p.assets.filter((x) => x.id !== data.removeAsset);
          p.analysis = undefined;
        }
        if (data.look) {
          const look = p.collection?.looks.find((x) => x.id === data.look!.id);
          if (!look) throw new Error("款式不存在");
          look.name = data.look.name;
          look.description = data.look.description;
        }
      },
    );
    return NextResponse.json(p);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function DELETE(r: Request, c: Context) {
  try {
    checkOrigin(r);
    await deleteProject(await workspace(), (await c.params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
