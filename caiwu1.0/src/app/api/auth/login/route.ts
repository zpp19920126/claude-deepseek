import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";
import { setCsrfToken } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

// 简单内存限速：每个 IP 每分钟最多 5 次尝试
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!checkRateLimit(ip)) {
      return apiErrorResponse(429, "尝试次数过多，请 1 分钟后再试");
    }

    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return apiErrorResponse(400, "请求格式无效");
    }

    const { username, password } = body;

    if (!username || !password) {
      return apiErrorResponse(400, "用户名和密码不能为空");
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return apiErrorResponse(401, "用户名或密码错误");
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return apiErrorResponse(401, "用户名或密码错误");
    }

    // 登录成功，清除该 IP 的限速记录
    rateLimit.delete(ip);

    await setSession(user.id, user.role);
    const csrfToken = await setCsrfToken();

    return apiSuccessResponse({ csrfToken, role: user.role });
  } catch (error) {
    console.error("登录失败:", error);
    return apiErrorResponse(500, "登录失败");
  }
}
