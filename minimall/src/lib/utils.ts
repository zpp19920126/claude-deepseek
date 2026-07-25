/**
 * 格式化价格显示（保留两位小数）
 */
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`;
}

/**
 * 生成订单号: YYYYMMDD-随机6位
 */
export function generateOrderNo(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${date}-${random}`;
}

/**
 * className 合并工具（简单版，替代 clsx）
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
