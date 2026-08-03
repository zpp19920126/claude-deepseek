import { NextRequest } from "next/server";

// 从请求中提取真实 IP（优先使用 Next.js 的 request.ip，回退到 x-forwarded-for 的第一个值）
export function getClientIP(request: NextRequest): string | undefined {
  // Next.js Node runtime 下 request.ip 可用
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const directIP = (request as any).ip as string | undefined;
  if (directIP) return directIP;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for 可能是 "client, proxy1, proxy2"，取第一个
    return forwarded.split(",")[0].trim();
  }

  return undefined;
}
