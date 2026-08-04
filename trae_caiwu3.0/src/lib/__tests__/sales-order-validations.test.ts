import { describe, it, expect } from "vitest";
import {
  createSalesOrderSchema,
  updateSalesOrderSchema,
} from "@/lib/validations";

function validInput() {
  return {
    deliveryOrderId: 1,
    customerId: 1,
    remark: "测试备注",
  };
}

describe("createSalesOrderSchema", () => {
  it("合法输入通过", () => {
    expect(createSalesOrderSchema.safeParse(validInput()).success).toBe(true);
  });

  it("remark 可选", () => {
    const { remark: _omitted, ...rest } = validInput();
    void _omitted;
    expect(createSalesOrderSchema.safeParse(rest).success).toBe(true);
  });

  it("remark 可为 null", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), remark: null }).success
    ).toBe(true);
  });

  it("remark 超过 500 字符失败", () => {
    expect(
      createSalesOrderSchema.safeParse({
        ...validInput(),
        remark: "a".repeat(501),
      }).success
    ).toBe(false);
  });

  it("deliveryOrderId 缺失失败", () => {
    const { deliveryOrderId: _omitted, ...rest } = validInput();
    void _omitted;
    expect(createSalesOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("deliveryOrderId 非正整数失败", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), deliveryOrderId: 0 })
        .success
    ).toBe(false);
  });

  it("deliveryOrderId 为负数失败", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), deliveryOrderId: -1 })
        .success
    ).toBe(false);
  });

  it("deliveryOrderId 为小数失败", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), deliveryOrderId: 1.5 })
        .success
    ).toBe(false);
  });

  it("customerId 缺失失败", () => {
    const { customerId: _omitted, ...rest } = validInput();
    void _omitted;
    expect(createSalesOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("customerId 非正整数失败", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...validInput(), customerId: 0 })
        .success
    ).toBe(false);
  });
});

describe("updateSalesOrderSchema", () => {
  it("空对象通过（部分更新）", () => {
    expect(updateSalesOrderSchema.safeParse({}).success).toBe(true);
  });

  it("仅更新 remark 通过", () => {
    expect(
      updateSalesOrderSchema.safeParse({ remark: "新备注" }).success
    ).toBe(true);
  });

  it("remark 超过 500 字符失败", () => {
    expect(
      updateSalesOrderSchema.safeParse({ remark: "a".repeat(501) }).success
    ).toBe(false);
  });

  it("不允许更新 deliveryOrderId（字段被忽略，不报错）", () => {
    // updateSalesOrderSchema 不包含 deliveryOrderId，传入会被 zod strip 掉
    const result = updateSalesOrderSchema.safeParse({
      deliveryOrderId: 999,
      remark: "x",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("deliveryOrderId");
    }
  });
});
