import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";
import { getMembershipInfo } from "@/lib/membership";
import { recordFailedLogin, clearFailedLogins, isRateLimited } from "@/lib/rate-limit";
import { setCsrfToken } from "@/lib/csrf";

/**
 * POST /api/auth/login
 * 登录 — 验证密码，写入 httpOnly session cookie + CSRF token
 * 登录失败统一返回"邮箱或密码错误"，不区分用户不存在/密码错误（防撞库）
 * 限流：同一 IP 15 分钟内最多 5 次失败尝试
 */
export async function POST(request: NextRequest) {
  try {
    // 获取客户端 IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // 检查限流状态
    if (isRateLimited(ip)) {
      return apiErrorResponse(429, "登录尝试过多，请 15 分钟后再试");
    }

    const body = await request.json();

    // Zod 校验
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return apiErrorResponse(400, firstError?.message || "参数错误");
    }

    const { email, password } = parsed.data;

    // 查找用户 → 不存在也返回相同错误
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      recordFailedLogin(ip);
      return apiErrorResponse(401, "邮箱或密码错误");
    }

    // 验证密码 → 不匹配也返回相同错误
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      recordFailedLogin(ip);
      return apiErrorResponse(401, "邮箱或密码错误");
    }

    // 登录成功：清除失败计数、写入 session + CSRF token
    clearFailedLogins(ip);
    await setSession(user.id, user.role);
    await setCsrfToken();

    const membership = getMembershipInfo(user.membershipLevel);

    return apiSuccessResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      membershipLevel: user.membershipLevel,
      membershipName: membership.name,
    });
  } catch (error) {
    console.error("登录失败:", error);
    return apiErrorResponse(500, "登录失败，请稍后重试");
  }
}
