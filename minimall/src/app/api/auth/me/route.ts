import { getCurrentUser } from "@/lib/auth";
import { getMembershipInfo } from "@/lib/membership";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return apiErrorResponse(401, "未登录");
    }

    const membership = getMembershipInfo(user.membershipLevel);

    return apiSuccessResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      membershipLevel: user.membershipLevel,
      membershipName: membership.name,
      totalSpent: user.totalSpent,
    });
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return apiErrorResponse(500, "获取用户信息失败");
  }
}
