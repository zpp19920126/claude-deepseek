import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("hashPassword", () => {
  it("返回 bcrypt 哈希字符串", async () => {
    const hash = await hashPassword("test123");
    expect(typeof hash).toBe("string");
    expect(hash.startsWith("$2a$")).toBe(true);
  });

  it("同一密码两次哈希结果不同（salt 随机）", async () => {
    const hash1 = await hashPassword("test123");
    const hash2 = await hashPassword("test123");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("正确密码返回 true", async () => {
    const hash = await hashPassword("mySecret123");
    const result = await verifyPassword("mySecret123", hash);
    expect(result).toBe(true);
  });

  it("错误密码返回 false", async () => {
    const hash = await hashPassword("mySecret123");
    const result = await verifyPassword("wrongPassword", hash);
    expect(result).toBe(false);
  });

  it("空字符串密码返回 false", async () => {
    const hash = await hashPassword("mySecret123");
    const result = await verifyPassword("", hash);
    expect(result).toBe(false);
  });
});
