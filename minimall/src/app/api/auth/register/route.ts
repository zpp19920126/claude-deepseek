import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

/**
 * POST /api/auth/register
 * 用户注册 — 验证邮箱唯一性，密码至少 6 位
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Zod 校验
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return apiErrorResponse(400, firstError?.message || "参数错误");
    }

    const { email, password, name } = parsed.data;

    // 检查邮箱唯一性
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiErrorResponse(409, "该邮箱已被注册");
    }

    // 哈希密码并创建用户
    const passwordHash = await hashPassword(password);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    return apiSuccessResponse(null, 201);
  } catch (error) {
    console.error("注册失败:", error);
    return apiErrorResponse(500, "注册失败，请稍后重试");
  }
}
