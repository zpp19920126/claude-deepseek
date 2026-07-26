/**
 * 从浏览器 Cookie 读取 CSRF token
 * 所有客户端组件共用
 */
export function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match?.[1] || "";
}
