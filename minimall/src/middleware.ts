import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";

// JWT 密钥 — 必须设置环境变量
function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET 环境变量未设置");
  }
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = "session";

/**
 * Edge 中间件 — 路由守卫
 * Layer 1: /admin/* → role === "ADMIN"
 *          /orders/*, /api/cart/*, /api/orders/* → 已登录
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 提取 session cookie 并验证 JWT
  let userId: string | null = null;
  let role: string | null = null;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      userId = payload.userId as string;
      role = payload.role as string;
    } catch {
      // JWT 无效 → 视为未登录
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

  // 需登录的路由
  const protectedPaths = ["/orders", "/api/cart", "/api/orders"];
  const needsAuth = protectedPaths.some((p) => pathname.startsWith(p));
  if (needsAuth && !userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "请先登录" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

/**
 * 匹配需要保护的路由
 */
export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/orders/:path*",
    "/api/cart/:path*",
    "/api/orders/:path*",
  ],
};
