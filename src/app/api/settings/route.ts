import { NextResponse } from "next/server";
import {
  workspace,
  getSettings,
  saveSettings,
  publicSettings,
} from "@/lib/server/store";
import {
  checkOrigin,
  errorResponse,
  jsonBody,
  rateLimit,
} from "@/lib/server/http";
import { settingsSchema } from "@/lib/types";
import { validateUrl, testProvider } from "@/lib/server/providers";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return NextResponse.json(
      publicSettings(await getSettings(await workspace())),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
export async function PUT(r: Request) {
  try {
    checkOrigin(r);
    const w = await workspace();
    rateLimit(`${w}:settings`, 15);
    const data = settingsSchema.parse(await jsonBody(r));
    await validateUrl(data.text.baseUrl);
    await validateUrl(data.image.baseUrl);
    return NextResponse.json(await saveSettings(w, data));
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(r: Request) {
  try {
    checkOrigin(r);
    const w = await workspace();
    rateLimit(`${w}:test`, 6);
    const { target } = await jsonBody(r);
    if (!["text", "image"].includes(target))
      throw new Error("请选择测试的模型");
    const s = await getSettings(w);
    return NextResponse.json({
      message: await testProvider(s[target as "text" | "image"]),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
