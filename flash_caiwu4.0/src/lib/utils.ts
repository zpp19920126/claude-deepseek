import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 合并 TailwindCSS 类名
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 格式化货币（防御 NaN/null/undefined）
export function formatCurrency(amount: number | null | undefined): string {
  const num = Number(amount);
  if (!Number.isFinite(num)) {
    return "¥0.00";
  }
  return `¥${num.toFixed(2)}`;
}

// 格式化日期时间
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// 格式化日期
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 生成订单号（使用 crypto.randomUUID 避免碰撞）
export function generateOrderNo(prefix: string): string {
  const now = new Date();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  // crypto.randomUUID 在 Node.js 16+ 可用，截取前 8 位作为短随机串
  const randomPart =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase()
      : Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}${dateStr}${randomPart}`;
}
