import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

/**
 * 生成 CSRF token 并写入 Cookie（可 JS 读取，非 httpOnly）
 * 在登录成功时调用
 */
export async function setCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const jar = await cookies();
  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,      // JS 可读，用于设置请求头
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 与 session 一致，30 天
  });
  return token;
}

/**
 * 清除 CSRF Cookie
 * 在登出时调用
 */
export async function clearCsrfToken(): Promise<void> {
  const jar = await cookies();
  jar.delete(CSRF_COOKIE);
}

/**
 * 从请求中验证 CSRF token
 * 比较 Header 中的 token 与 Cookie 中的 token（双提交 Cookie 模式）
 */
export async function validateCsrf(request: Request): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken) return false;

  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;

  // 常量时间比较，防时序攻击
  if (headerToken.length !== cookieToken.length) return false;

  let diff = 0;
  for (let i = 0; i < headerToken.length; i++) {
    diff |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  return diff === 0;
}
