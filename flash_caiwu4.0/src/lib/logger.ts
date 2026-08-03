import { prisma } from "./prisma";
import { getSession } from "./session";

type Action =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "export"
  | "import"
  | "status";
type Module =
  | "product"
  | "category"
  | "unit"
  | "customer"
  | "supplier"
  | "sales"
  | "purchase"
  | "user";

interface LogOptions {
  action: Action;
  module: Module;
  targetId?: number;
  detail?: Record<string, unknown>;
  ipAddress?: string;
}

// 记录操作日志
export async function logOperation(options: LogOptions): Promise<void> {
  try {
    const session = await getSession();
    if (!session) return;

    await prisma.operationLog.create({
      data: {
        userId: session.userId,
        action: options.action,
        module: options.module,
        targetId: options.targetId,
        // 详情截断，防止超长内容灌库
        detail: options.detail ? JSON.stringify(options.detail).slice(0, 500) : null,
        ipAddress: options.ipAddress,
      },
    });
  } catch (error) {
    // 日志记录失败不应影响主流程
    console.error("记录操作日志失败:", error);
  }
}
