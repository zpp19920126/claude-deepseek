import { clearSession } from "@/lib/auth";
import { clearCsrfToken } from "@/lib/csrf";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function POST() {
  try {
    await clearSession();
    await clearCsrfToken();
    return apiSuccessResponse(null);
  } catch (error) {
    console.error("登出失败:", error);
    return apiErrorResponse(500, "登出失败");
  }
}
