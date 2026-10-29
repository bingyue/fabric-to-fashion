import { NextResponse } from "next/server";
import { workspace, assetBuffer, readProject } from "@/lib/server/store";
import { errorResponse } from "@/lib/server/http";
export const runtime = "nodejs";
export async function GET(
  r: Request,
  c: { params: Promise<{ projectId: string; filename: string }> },
) {
  try {
    const w = await workspace();
    const { projectId, filename } = await c.params;
    await readProject(w, projectId);
    const buffer = await assetBuffer(w, `/api/assets/${projectId}/${filename}`);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": filename.endsWith(".png")
          ? "image/png"
          : filename.endsWith(".webp")
            ? "image/webp"
            : "image/jpeg",
        "Cache-Control": "private, max-age=86400",
        ...(new URL(r.url).searchParams.has("download")
          ? { "Content-Disposition": `attachment; filename="${filename}"` }
          : {}),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
