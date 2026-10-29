import { NextResponse } from "next/server";
import { workspace, listProjects, createProject } from "@/lib/server/store";
import { checkOrigin, errorResponse, rateLimit } from "@/lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(await listProjects(await workspace()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(r: Request) {
  try {
    checkOrigin(r);
    const w = await workspace();
    rateLimit(`${w}:create`, 15);
    return NextResponse.json(await createProject(w), { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
