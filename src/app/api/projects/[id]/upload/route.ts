import { NextResponse } from "next/server";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { workspace, mutateProject, writeAsset } from "@/lib/server/store";
import { checkOrigin, errorResponse, rateLimit } from "@/lib/server/http";
import type { Asset } from "@/lib/types";
export const runtime = "nodejs";
export async function POST(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(r);
    const w = await workspace(),
      { id } = await c.params;
    rateLimit(`${w}:upload`, 15);
    if (Number(r.headers.get("content-length")) > 65 * 1024 * 1024)
      throw new Error("上传总大小不能超过 60 MB");
    const form = await r.formData();
    const sample = form.get("sample") === "true";
    const role = form.get("role") === "reference" ? "reference" : "fabric";
    const files = form.getAll("files") as File[];
    if (!sample && (!files.length || files.length > 6))
      throw new Error("每次请上传 1–6 张图片");
    const p = await mutateProject(w, id, async (p) => {
      if (p.task?.status === "running")
        throw new Error("请等待生成完成后再上传");
      if (p.assets.length + (sample ? 1 : files.length) > 6)
        throw new Error("每个项目最多支持 6 张面料与参考图");
      const assets: Asset[] = [];
      if (sample) {
        assets.push({
          id: randomUUID(),
          name: "燕麦色人字纹 · 示例面料",
          url: "/demo/fabric.jpg",
          originalUrl: "/demo/fabric.jpg",
          role: "fabric",
          mime: "image/jpeg",
          size: 0,
        });
      } else
        for (const f of files) {
          if (
            !(f instanceof File) ||
            !["image/jpeg", "image/png", "image/webp"].includes(f.type)
          )
            throw new Error("仅支持 JPG、PNG、WebP 图片");
          if (f.size > 10 * 1024 * 1024 || f.size === 0)
            throw new Error("每张图片需小于 10 MB 且不能为空");
          const bytes = Buffer.from(await f.arrayBuffer());
          let normalized, format;
          try {
            const input = sharp(bytes, { limitInputPixels: 40000000 });
            const metadata = await input.metadata();
            format = metadata.format;
            if (!["jpeg", "png", "webp"].includes(format || ""))
              throw new Error();
            normalized = await input
              .rotate()
              .resize(2400, 2400, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 92 })
              .toBuffer();
          } catch {
            throw new Error("图片无法读取或像素过大，请更换文件");
          }
          const originalUrl = await writeAsset(
            w,
            id,
            bytes,
            format === "jpeg" ? "jpg" : format!,
          );
          const url = await writeAsset(w, id, normalized);
          assets.push({
            id: randomUUID(),
            name: f.name.slice(0, 150),
            url,
            originalUrl,
            role,
            mime: f.type,
            size: f.size,
          });
        }
      p.assets.push(...assets);
      p.analysis = undefined;
    });
    return NextResponse.json(p);
  } catch (e) {
    return errorResponse(e);
  }
}
