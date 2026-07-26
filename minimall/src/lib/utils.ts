import { randomBytes } from "crypto";

/**
 * 格式化价格显示（分 → 元，保留两位小数）
 */
export function formatPrice(priceInCents: number): string {
  return `¥${(priceInCents / 100).toFixed(2)}`;
}

/**
 * 生成订单号: YYYYMMDD-随机6位
 * 使用 crypto.randomBytes 替代 Math.random
 */
export function generateOrderNo(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const random = randomBytes(4).toString("hex").substring(0, 6).toUpperCase();
  return `${date}-${random}`;
}

/**
 * className 合并工具
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
