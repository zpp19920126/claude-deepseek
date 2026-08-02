import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET 环境变量未设置");
  }
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = "session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let role: string | null = null;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      role = payload.role as string;
    } catch {
      // JWT 无效
    }
  }

  // Admin 路由 → 必须 ADMIN
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (role !== "ADMIN") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "无权访问" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
