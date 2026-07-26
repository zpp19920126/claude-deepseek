import { hash, compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

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

// Cookie 选项 — 正确的类型签名
function getCookieOptions(maxAge?: number): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: maxAge ?? SESSION_MAX_AGE,
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
  jar.set(COOKIE_NAME, token, getCookieOptions());
}

/**
 * 从 Cookie 读取当前 session payload
 * 运行时校验 JWT payload 字段类型
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

    // 运行时类型校验，防止格式异常静默传播
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }

    return { userId: payload.userId, role: payload.role };
  } catch {
    // JWT 过期、签名不匹配、格式损坏 → 返回 null
    return null;
  }
}

/**
 * 获取当前用户的完整信息（不含 passwordHash）
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      totalSpent: true,
      membershipLevel: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * 清除 session Cookie（退出登录）
 */
export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}
