// 简易内存限流器（适合单机 SQLite 部署场景）
// 生产环境若多实例部署，应替换为 Redis 实现

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  key: string;
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// 检查是否超过限流阈值
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = store.get(options.key);

  // 窗口已过期或无记录，重置
  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.windowMs;
    store.set(options.key, { count: 1, resetAt });
    return { allowed: true, remaining: options.maxAttempts - 1, resetAt };
  }

  // 已达上限
  if (entry.count >= options.maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // 增加计数
  entry.count += 1;
  return {
    allowed: true,
    remaining: options.maxAttempts - entry.count,
    resetAt: entry.resetAt,
  };
}

// 重置某个 key 的限流（登录成功后调用）
export function resetRateLimit(key: string): void {
  store.delete(key);
}

// 定期清理过期条目，避免内存泄漏（每 5 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);
