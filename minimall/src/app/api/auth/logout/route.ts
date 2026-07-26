import { clearSession } from "@/lib/auth";
import { clearCsrfToken } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * POST /api/auth/logout
 * 退出登录 — 清除 session cookie + CSRF token
 */
export async function POST() {
  try {
    await clearSession();
    await clearCsrfToken();
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("退出登录失败:", error);
    return apiErrorResponse(500, "退出登录失败");
  }
}
