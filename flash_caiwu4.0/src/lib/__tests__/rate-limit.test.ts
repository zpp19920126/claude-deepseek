import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("rate-limit", () => {
  const testKey = "test:rate-limit-key";

  beforeEach(() => {
    resetRateLimit(testKey);
  });

  afterEach(() => {
    resetRateLimit(testKey);
  });

  it("首次请求允许通过", () => {
    const result = checkRateLimit({
      key: testKey,
      maxAttempts: 5,
      windowMs: 60000,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("未达上限时累计计数", () => {
    checkRateLimit({ key: testKey, maxAttempts: 3, windowMs: 60000 });
    checkRateLimit({ key: testKey, maxAttempts: 3, windowMs: 60000 });
    const result = checkRateLimit({
      key: testKey,
      maxAttempts: 3,
      windowMs: 60000,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("达到上限后拒绝请求", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit({ key: testKey, maxAttempts: 5, windowMs: 60000 });
    }
    const result = checkRateLimit({
      key: testKey,
      maxAttempts: 5,
      windowMs: 60000,
    });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("resetRateLimit 后可重新请求", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit({ key: testKey, maxAttempts: 5, windowMs: 60000 });
    }
    expect(
      checkRateLimit({ key: testKey, maxAttempts: 5, windowMs: 60000 }).allowed
    ).toBe(false);

    resetRateLimit(testKey);
    const result = checkRateLimit({
      key: testKey,
      maxAttempts: 5,
      windowMs: 60000,
    });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("不同 key 互不影响", () => {
    const key1 = "test:key1";
    const key2 = "test:key2";

    for (let i = 0; i < 3; i++) {
      checkRateLimit({ key: key1, maxAttempts: 3, windowMs: 60000 });
    }
    const result1 = checkRateLimit({
      key: key1,
      maxAttempts: 3,
      windowMs: 60000,
    });
    const result2 = checkRateLimit({
      key: key2,
      maxAttempts: 3,
      windowMs: 60000,
    });

    expect(result1.allowed).toBe(false);
    expect(result2.allowed).toBe(true);

    resetRateLimit(key1);
    resetRateLimit(key2);
  });
});
