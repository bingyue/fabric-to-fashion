import { NextResponse } from "next/server";
import { ZodError } from "zod";
export function errorResponse(error: unknown) {
  const message =
    error instanceof ZodError
      ? "输入不符合要求，请检查字段长度与内容。"
      : error instanceof Error && "code" in error
        ? "服务端文件访问失败，请检查数据目录后重试。"
        : error instanceof Error
          ? error.message
          : "请求失败，请稍后重试";
  const status = message.includes("不存在")
    ? 404
    : message.includes("频繁")
      ? 429
      : 400;
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  let allowed = false;
  try {
    const parsed = new URL(origin);
    allowed = process.env.APP_ORIGIN
      ? parsed.origin === new URL(process.env.APP_ORIGIN).origin
      : ["http:", "https:"].includes(parsed.protocol) &&
        parsed.host ===
          (request.headers.get("host") || new URL(request.url).host);
  } catch {}
  if (!allowed) throw new Error("不允许跨站请求");
}
const state = globalThis as typeof globalThis & {
  fabricRate?: Map<string, { time: number; count: number }>;
};
export function rateLimit(key: string, limit = 20) {
  state.fabricRate ||= new Map();
  const now = Date.now();
  if (state.fabricRate.size > 10000)
    for (const [k, v] of state.fabricRate)
      if (now - v.time > 60000) state.fabricRate.delete(k);
  const old = state.fabricRate.get(key);
  if (!old || now - old.time > 60000) {
    state.fabricRate.set(key, { time: now, count: 1 });
    return;
  }
  if (++old.count > limit) throw new Error("请求过于频繁，请稍后重试");
}
export async function jsonBody(r: Request) {
  const reader = r.body?.getReader();
  if (!reader) throw new Error("请求内容不能为空");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 160000) throw new Error("请求内容过长");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("请求格式无效，请提交 JSON 数据");
  }
}
