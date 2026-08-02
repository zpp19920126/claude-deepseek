import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { apiSuccessResponse, apiErrorResponse } from "@/lib/api-error";

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin())) return apiErrorResponse(403, "无权访问");

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const entity = searchParams.get("entity") || "";
    const action = searchParams.get("action") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const where: Prisma.AuditLogWhereInput = {};

    if (search) {
      where.OR = [
        { entity: { contains: search } },
        { entityId: { contains: search } },
        { operator: { contains: search } },
        { detail: { contains: search } },
      ];
    }
    if (entity) where.entity = entity;
    if (action) where.action = action;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return apiSuccessResponse({ items, total, page, pageSize: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
  } catch (error) {
    console.error("获取审计日志失败:", error);
    return apiErrorResponse(500, "获取审计日志失败");
  }
}
