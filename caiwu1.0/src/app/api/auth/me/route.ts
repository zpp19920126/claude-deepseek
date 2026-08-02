import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiErrorResponse(401, "未登录");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return apiErrorResponse(401, "用户不存在");
    }

    return apiSuccessResponse(user);
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return apiErrorResponse(500, "获取用户信息失败");
  }
}
