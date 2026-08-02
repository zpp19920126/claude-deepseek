import { NextRequest } from "next/server";
import { clearSession } from "@/lib/auth";
import { clearCsrfToken, validateCsrf } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function POST(request: NextRequest) {
  try {
    if (!(await validateCsrf(request))) return apiErrorResponse(403, "CSRF 验证失败");
    await clearSession();
    await clearCsrfToken();
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("登出失败:", error);
    return apiErrorResponse(500, "登出失败");
  }
}
