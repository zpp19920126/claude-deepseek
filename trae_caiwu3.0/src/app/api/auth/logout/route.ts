import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { logOperation } from "@/lib/logger";

export async function POST() {
  try {
    // 记录登出日志
    await logOperation({
      action: "logout",
      module: "user",
    });

    await clearSession();

    return NextResponse.json({
      success: true,
      message: "登出成功",
    });
  } catch (error) {
    console.error("登出失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
