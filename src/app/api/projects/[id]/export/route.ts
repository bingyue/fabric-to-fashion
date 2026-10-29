import { NextResponse } from "next/server";
import archiver from "archiver";
import { workspace, readProject, assetBuffer } from "@/lib/server/store";
import { errorResponse, rateLimit } from "@/lib/server/http";
import { makePdf } from "@/lib/server/pdf";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function GET(r: Request, c: { params: Promise<{ id: string }> }) {
  try {
    const w = await workspace(),
      p = await readProject(w, (await c.params).id);
    rateLimit(`${w}:export`, 8);
    if (p.task?.status === "running") throw new Error("请等待生成完成后导出");
    if (!p.collection?.looks.some((l) => l.image))
      throw new Error("请先生成至少一款成衣效果图");
    const format = new URL(r.url).searchParams.get("format") || "pdf";
    let buffer: Buffer;
    if (format === "pdf") buffer = await makePdf(w, p);
    else if (format === "zip") {
      const archive = archiver("zip", { zlib: { level: 5 } }),
        chunks: Buffer[] = [];
      const done = new Promise<Buffer>((resolve, reject) => {
        archive.on("data", (chunk) => chunks.push(chunk));
        archive.on("end", () => resolve(Buffer.concat(chunks)));
        archive.on("error", reject);
      });
      for (let i = 0; i < p.collection.looks.length; i++) {
        const l = p.collection.looks[i];
        if (l.image)
          archive.append(await assetBuffer(w, l.image), {
            name: `LOOK-${String(i + 1).padStart(2, "0")}.jpg`,
          });
      }
      archive.append(
        JSON.stringify(
          {
            name: p.name,
            mode: p.generationMode,
            snapshot: p.generationSnapshot,
            collection: p.collection,
          },
          null,
          2,
        ),
        { name: "collection.json" },
      );
      archive.append(
        p.generationMode === "demo"
          ? "DEMO: These are pre-generated example images. They do not reflect uploaded fabric or requested revisions."
          : "AI-assisted concept images. Fabric and construction require physical verification.",
        { name: "READ-ME.txt" },
      );
      await archive.finalize();
      buffer = await done;
    } else throw new Error("不支持的导出格式");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          format === "pdf" ? "application/pdf" : "application/zip",
        "Content-Disposition": `attachment; filename="FABRIQ-collection.${format}"; filename*=UTF-8''${encodeURIComponent(p.name)}.${format}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
