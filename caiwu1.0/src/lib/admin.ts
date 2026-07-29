import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return false;

  // 验证用户仍存在于数据库且角色未变
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}
