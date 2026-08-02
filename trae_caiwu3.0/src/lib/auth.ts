import { SignJWT, jwtVerify } from "jose";

// 启动时强校验 JWT 密钥，缺失或过短直接抛错（fail-fast）
const secretKey = process.env.JWT_SECRET;
if (!secretKey || secretKey.length < 32) {
  throw new Error(
    "JWT_SECRET 未配置或长度不足 32 字符，请在 .env 中设置强随机密钥"
  );
}

const secret = new TextEncoder().encode(secretKey);

export const TOKEN_COOKIE_NAME = "lvliang_token";
export const TOKEN_EXPIRY = "7d";
export const TOKEN_EXPIRY_SECONDS = 60 * 60 * 24 * 7; // 7 天

// 导出 secret 供 proxy.ts 复用，避免重复定义
export { secret };

export interface JWTPayload {
  userId: number;
  username: string;
  name: string;
  role: string;
}

// 签发 JWT
export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(secret);
}

// 校验 JWT
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
