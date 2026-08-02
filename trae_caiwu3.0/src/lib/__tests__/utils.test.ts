import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatDateTime,
  formatDate,
  generateOrderNo,
} from "@/lib/utils";

describe("cn", () => {
  it("合并多个类名", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("处理条件类名", () => {
    expect(cn("base", false && "hidden", true && "visible")).toBe(
      "base visible"
    );
  });

  it("合并冲突的 Tailwind 类（后者优先）", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});

describe("formatCurrency", () => {
  it("格式化正常数字", () => {
    expect(formatCurrency(123.456)).toBe("¥123.46");
  });

  it("格式化整数", () => {
    expect(formatCurrency(100)).toBe("¥100.00");
  });

  it("格式化 0", () => {
    expect(formatCurrency(0)).toBe("¥0.00");
  });

  it("NaN 返回兜底值", () => {
    expect(formatCurrency(NaN)).toBe("¥0.00");
  });

  it("null 返回兜底值", () => {
    expect(formatCurrency(null)).toBe("¥0.00");
  });

  it("undefined 返回兜底值", () => {
    expect(formatCurrency(undefined)).toBe("¥0.00");
  });

  it("Infinity 返回兜底值", () => {
    expect(formatCurrency(Infinity)).toBe("¥0.00");
  });
});

describe("formatDateTime", () => {
  it("格式化 Date 对象", () => {
    const date = new Date(2026, 0, 15, 14, 30);
    const result = formatDateTime(date);
    expect(result).toContain("2026");
    expect(result).toContain("01");
    expect(result).toContain("15");
  });

  it("格式化日期字符串", () => {
    const result = formatDateTime("2026-01-15T14:30:00");
    expect(result).toContain("2026");
  });
});

describe("formatDate", () => {
  it("格式化 Date 对象", () => {
    const date = new Date(2026, 0, 15);
    const result = formatDate(date);
    expect(result).toContain("2026");
    expect(result).toContain("01");
    expect(result).toContain("15");
  });
});

describe("generateOrderNo", () => {
  it("包含前缀", () => {
    const orderNo = generateOrderNo("XS");
    expect(orderNo.startsWith("XS")).toBe(true);
  });

  it("包含 14 位时间戳（YYYYMMDDHHmmss）", () => {
    const orderNo = generateOrderNo("XS");
    // 前缀 + 14 位时间 + 8 位随机 = 至少 22 位
    expect(orderNo.length).toBeGreaterThanOrEqual(22);
  });

  it("每次生成都不同", () => {
    const orderNo1 = generateOrderNo("XS");
    const orderNo2 = generateOrderNo("XS");
    expect(orderNo1).not.toBe(orderNo2);
  });
});
