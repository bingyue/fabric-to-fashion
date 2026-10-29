import { NextResponse } from "next/server";
import {
  workspace,
  readProject,
  mutateProject,
  getSettings,
} from "@/lib/server/store";
import { checkOrigin, errorResponse, rateLimit } from "@/lib/server/http";
import { analyze } from "@/lib/server/providers";
import { demoAnalysis } from "@/lib/demo";
export const runtime = "nodejs";
export const maxDuration = 90;
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(r);
    const w = await workspace(),
      { id } = await c.params;
    rateLimit(`${w}:analyze`, 8);
    const p = await readProject(w, id);
    if (p.task?.status === "running") throw new Error("请等待当前生成完成");
    if (!p.assets.some((x) => x.role === "fabric"))
      throw new Error("请先上传面料图片");
    const settings = await getSettings(w);
    const analysis =
      settings.mode === "demo"
        ? structuredClone(demoAnalysis)
        : await analyze(w, p, settings.text);
    return NextResponse.json(
      await mutateProject(w, id, (current) => {
        if (
          current.task?.status === "running" ||
          JSON.stringify(current.assets) !== JSON.stringify(p.assets)
        )
          throw new Error("项目已更新，请重新分析");
        current.analysis = analysis;
      }),
    );
  } catch (e) {
    return errorResponse(e);
  }
}
