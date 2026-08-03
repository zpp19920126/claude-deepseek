import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";
import { logOperation } from "@/lib/logger";
import { getClientIP } from "@/lib/ip";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

// 预生成的 dummy hash，用于用户不存在时消耗相同时间，避免时序侧信道
const DUMMY_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimitKey = `login:${clientIP || "unknown"}`;

    // 限流：同一 IP 5 分钟内最多 10 次尝试
    const rateLimit = checkRateLimit({
      key: rateLimitKey,
      maxAttempts: 10,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      const retrySeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          success: false,
          error: `尝试次数过多，请 ${retrySeconds} 秒后重试`,
        },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    // 用户不存在时也执行一次 bcrypt 比较，让响应时间与用户存在时接近
    if (!user) {
      await verifyPassword(password, DUMMY_HASH);
      return NextResponse.json(
        { success: false, error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 登录成功，重置限流计数
    resetRateLimit(rateLimitKey);

    // 设置会话
    await setSession({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    // 记录登录日志
    await logOperation({
      action: "login",
      module: "user",
      targetId: user.id,
      ipAddress: clientIP,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
      message: "登录成功",
    });
  } catch (error) {
    console.error("登录失败:", error);
    return NextResponse.json(
      { success: false, error: "服务器错误，请稍后重试" },
      { status: 500 }
    );
  }
}
