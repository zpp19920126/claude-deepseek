import { describe, it, expect } from "vitest";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from "@/lib/validations";

function validItem() {
  return {
    productId: 1,
    reservedQuantity: 10,
    receivedQuantity: 10,
    reservedUnitId: 1,
    receivedUnitId: 1,
    unitPrice: 5.5,
  };
}

function validInput() {
  return {
    supplierId: 1,
    items: [validItem()],
  };
}

describe("createPurchaseOrderSchema", () => {
  it("合法输入通过", () => {
    expect(createPurchaseOrderSchema.safeParse(validInput()).success).toBe(true);
  });

  it("remark 可选", () => {
    const input = { ...validInput(), remark: "测试备注" };
    expect(createPurchaseOrderSchema.safeParse(input).success).toBe(true);
  });

  it("remark 可为 null", () => {
    const input = { ...validInput(), remark: null };
    expect(createPurchaseOrderSchema.safeParse(input).success).toBe(true);
  });

  it("remark 超过 500 字符失败", () => {
    const input = { ...validInput(), remark: "a".repeat(501) };
    expect(createPurchaseOrderSchema.safeParse(input).success).toBe(false);
  });

  it("supplierId 缺失失败", () => {
    const { supplierId: _o, ...rest } = validInput();
    void _o;
    expect(createPurchaseOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("supplierId 非正整数失败", () => {
    const input = { ...validInput(), supplierId: 0 };
    expect(createPurchaseOrderSchema.safeParse(input).success).toBe(false);
  });

  it("items 为空数组失败", () => {
    const input = { ...validInput(), items: [] };
    expect(createPurchaseOrderSchema.safeParse(input).success).toBe(false);
  });

  it("同一单据内重复商品失败", () => {
    const input = { ...validInput(), items: [validItem(), validItem()] };
    expect(createPurchaseOrderSchema.safeParse(input).success).toBe(false);
  });

  it("reservedQuantity 为负数失败", () => {
    const input = {
      ...validInput(),
      items: [{ ...validItem(), reservedQuantity: -1 }],
    };
    expect(createPurchaseOrderSchema.safeParse(input).success).toBe(false);
  });

  it("unitPrice 为负数失败", () => {
    const input = {
      ...validInput(),
      items: [{ ...validItem(), unitPrice: -1 }],
    };
    expect(createPurchaseOrderSchema.safeParse(input).success).toBe(false);
  });
});

describe("updatePurchaseOrderSchema", () => {
  it("空对象通过（部分更新）", () => {
    expect(updatePurchaseOrderSchema.safeParse({}).success).toBe(true);
  });

  it("仅更新 status 通过", () => {
    expect(
      updatePurchaseOrderSchema.safeParse({ status: "received" }).success
    ).toBe(true);
  });

  it("status 非法值失败", () => {
    expect(
      updatePurchaseOrderSchema.safeParse({ status: "invalid" }).success
    ).toBe(false);
  });

  it("remark 超过 500 字符失败", () => {
    expect(
      updatePurchaseOrderSchema.safeParse({ remark: "a".repeat(501) }).success
    ).toBe(false);
  });
});
