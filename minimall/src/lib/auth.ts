import { hash, compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// JWT 密钥 — 必须设置 AUTH_SECRET，禁止硬编码回退
function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET 环境变量未设置，JWT 签名必须有唯一密钥");
  }
  return new TextEncoder().encode(secret);
}

const COOKIE_NAME = "session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 天（秒）

// Cookie 选项
function getCookieOptions(): Partial<Record<string, unknown>> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

/**
 * 哈希密码
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  password: string,
  hashed: string
): Promise<boolean> {
  return compare(password, hashed);
}

/**
 * 设置 session Cookie（httpOnly）
 */
export async function setSession(userId: string, role: string): Promise<void> {
  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, getCookieOptions() as never);
}

/**
 * 从 Cookie 读取当前 session payload
 */
export async function getSession(): Promise<{
  userId: string;
  role: string;
} | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: payload.userId as string,
      role: payload.role as string,
    };
  } catch {
    // JWT 过期、签名不匹配、格式损坏 → 返回 null
    return null;
  }
}

/**
 * 获取当前用户的完整信息
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  return user;
}

/**
 * 清除 session Cookie（退出登录）
 */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
