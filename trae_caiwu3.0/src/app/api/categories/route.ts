import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";

// 获取分类列表（供选择器使用）
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();

    const where = search ? { name: { contains: search } } : undefined;

    const categories = await prisma.category.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("获取分类列表失败:", error);
    return NextResponse.json(
      { success: false, error: "获取分类列表失败" },
      { status: 500 }
    );
  }
}
