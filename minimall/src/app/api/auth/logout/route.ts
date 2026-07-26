import { NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { clearCsrfToken } from "@/lib/csrf";
import { validateCsrf } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * POST /api/auth/logout
 * 退出登录 — 清除 session + CSRF token，需 CSRF 验证
 */
export async function POST(request: NextRequest) {
  try {
    // CSRF 验证（需先有 session 才有 CSRF cookie）
    if (!(await validateCsrf(request))) {
      return apiErrorResponse(403, "CSRF 验证失败");
    }

    await clearSession();
    await clearCsrfToken();
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("退出登录失败:", error);
    return apiErrorResponse(500, "退出登录失败");
  }
}
