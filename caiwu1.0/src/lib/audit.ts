import { prisma } from "@/lib/prisma";

type Action = "CREATE" | "UPDATE" | "DELETE";
type Entity = "Product" | "Customer" | "Supplier" | "Unit" | "Category" | "SalesOrder";

/**
 * 记录审计日志
 * detail 自动截断到 200 字符防止日志灌水
 */
export async function auditLog(params: {
  action: Action;
  entity: Entity;
  entityId: string;
  detail?: string;
  operator?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        ...params,
        detail: params.detail ? params.detail.slice(0, 200) : null,
        operator: params.operator || "system",
      },
    });
  } catch (error) {
    console.error("审计日志写入失败:", error);
  }
}

/**
 * 从 session 获取操作人标识
 */
export async function getOperator(): Promise<string> {
  try {
    const { getSession } = await import("@/lib/auth");
    const session = await getSession();
    return session?.userId || "anonymous";
  } catch {
    return "public";
  }
}
