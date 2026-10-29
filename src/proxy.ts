import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
export function proxy(request: NextRequest) {
  const password = process.env.STUDIO_PASSWORD;
  if (!password) return NextResponse.next();
  const auth = request.headers.get("authorization");
  let supplied = "";
  try {
    supplied = Buffer.from(auth?.split(" ")[1] || "", "base64")
      .toString()
      .split(":")
      .slice(1)
      .join(":");
  } catch {}
  const a = Buffer.from(supplied),
    b = Buffer.from(password);
  if (a.length === b.length && timingSafeEqual(a, b))
    return NextResponse.next();
  return new NextResponse("请输入工作室访问密码", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Fabric Studio", charset="UTF-8"',
    },
  });
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
