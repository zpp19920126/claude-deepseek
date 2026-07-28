import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

export async function setCsrfToken(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const jar = await cookies();
  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  return token;
}

export async function clearCsrfToken(): Promise<void> {
  const jar = await cookies();
  jar.delete(CSRF_COOKIE);
}

export async function validateCsrf(request: Request): Promise<boolean> {
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken) return false;

  const jar = await cookies();
  const cookieToken = jar.get(CSRF_COOKIE)?.value;
  if (!cookieToken) return false;

  if (headerToken.length !== cookieToken.length) return false;

  let diff = 0;
  for (let i = 0; i < headerToken.length; i++) {
    diff |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  return diff === 0;
}
