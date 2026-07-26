/**
 * 简易内存限流器
 * 基于 IP 的失败登录计数，适用于单机/SQLite 部署
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 每 10 分钟清理过期条目
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 10 * 60 * 1000).unref();

/**
 * 登录限流配置
 * - 同一 IP 每窗口最多 5 次失败尝试
 * - 超过后封锁 15 分钟
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 分钟
const LOGIN_MAX_ATTEMPTS = 5;

/**
 * 记录一次登录失败
 * @returns 剩余可用次数（<=0 表示已触发限流）
 */
export function recordFailedLogin(ip: string): number {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return LOGIN_MAX_ATTEMPTS - 1;
  }

  entry.count++;
  return Math.max(0, LOGIN_MAX_ATTEMPTS - entry.count);
}

/**
 * 登录成功后清除失败计数
 */
export function clearFailedLogins(ip: string): void {
  store.delete(ip);
}

/**
 * 检查是否已触发限流
 */
export function isRateLimited(ip: string): boolean {
  const entry = store.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    store.delete(ip);
    return false;
  }
  return entry.count > LOGIN_MAX_ATTEMPTS;
}
