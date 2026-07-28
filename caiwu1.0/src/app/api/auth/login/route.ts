import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSession } from "@/lib/auth";
import { setCsrfToken } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

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

    await setSession(user.id, user.role);
    const csrfToken = await setCsrfToken();

    return apiSuccessResponse({ csrfToken, role: user.role });
  } catch (error) {
    console.error("登录失败:", error);
    return apiErrorResponse(500, "登录失败");
  }
}
