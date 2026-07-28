import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { randomBytes } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(priceInYuan: number): string {
  return `¥${priceInYuan.toFixed(2)}`;
}

/**
 * 从 Cookie 读取 CSRF Token（客户端用）
 */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? match[1] : "";
}

/**
 * 安全解析整数，非数字返回 null
 */
export function safeParseInt(value: string): number | null {
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

/**
 * 安全解析浮点数，非数字返回 null
 */
export function safeParseFloat(value: string): number | null {
  const n = parseFloat(value);
  return isNaN(n) ? null : n;
}

export function generateDocumentNo(): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const random = randomBytes(3).toString("hex").substring(0, 4).toUpperCase();
  return `${date}-${random}`;
}
