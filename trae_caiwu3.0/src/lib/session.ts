import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken, signToken, TOKEN_COOKIE_NAME, TOKEN_EXPIRY_SECONDS, type JWTPayload } from "./auth";
import { prisma } from "./prisma";

// 设置会话 Cookie
export async function setSession(payload: JWTPayload): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_EXPIRY_SECONDS,
  });
}

// 清除会话 Cookie
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(TOKEN_COOKIE_NAME);
}

// 获取当前登录用户信息（从 Cookie 解析，不查库）
export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// 获取当前登录用户（含数据库查询，验证用户仍存在）
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return user;
}

// 要求登录，否则返回 401 响应（API 路由用）
export async function requireAuth(): Promise<JWTPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: "未登录或登录已过期" },
      { status: 401 }
    );
  }

  // 验证用户仍存在且未被删除
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });

  if (!user) {
    // 用户已删除，清理无效会话
    await clearSession();
    return NextResponse.json(
      { success: false, error: "用户不存在，请重新登录" },
      { status: 401 }
    );
  }

  // 返回最新的 session（role 可能被更新）
  return { ...session, role: user.role };
}

// 要求管理员权限，否则返回 403（API 路由用）
export async function requireAdmin(): Promise<JWTPayload | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  if (result.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "权限不足，需要管理员权限" },
      { status: 403 }
    );
  }

  return result;
}
