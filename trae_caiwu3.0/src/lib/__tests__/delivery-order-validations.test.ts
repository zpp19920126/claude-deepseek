import { describe, it, expect } from "vitest";
import {
  createDeliveryOrderSchema,
  updateDeliveryOrderSchema,
} from "@/lib/validations";

function validItem() {
  return {
    productId: 1,
    reservedUnitId: 1,
    reservedQuantity: 10,
    deliveryUnitId: 1,
    deliveryQuantity: 10,
    receivedQuantity: 10,
    unitPrice: 2.5,
  };
}

function validInput() {
  return {
    status: "pending",
    remark: "测试备注",
    items: [validItem()],
  };
}

describe("createDeliveryOrderSchema", () => {
  it("合法输入通过", () => {
    expect(createDeliveryOrderSchema.safeParse(validInput()).success).toBe(true);
  });

  it("items 为空数组失败", () => {
    expect(
      createDeliveryOrderSchema.safeParse({ ...validInput(), items: [] }).success
    ).toBe(false);
  });

  it("items 缺失失败", () => {
    const { items: _omitted, ...rest } = validInput();
    void _omitted;
    expect(createDeliveryOrderSchema.safeParse(rest).success).toBe(false);
  });

  it("非法 status 失败", () => {
    expect(
      createDeliveryOrderSchema.safeParse({ ...validInput(), status: "unknown" })
        .success
    ).toBe(false);
  });

  it("status 可省略（默认 pending）", () => {
    const { status: _omitted, ...rest } = validInput();
    void _omitted;
    const r = createDeliveryOrderSchema.safeParse(rest);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe("pending");
  });

  it("reservedQuantity 为负失败", () => {
    const r = createDeliveryOrderSchema.safeParse({
      ...validInput(),
      items: [{ ...validItem(), reservedQuantity: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it("unitPrice 为负失败", () => {
    const r = createDeliveryOrderSchema.safeParse({
      ...validInput(),
      items: [{ ...validItem(), unitPrice: -0.1 }],
    });
    expect(r.success).toBe(false);
  });

  it("productId 非正整数失败", () => {
    const r = createDeliveryOrderSchema.safeParse({
      ...validInput(),
      items: [{ ...validItem(), productId: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("同一单据内重复 productId 失败", () => {
    const r = createDeliveryOrderSchema.safeParse({
      ...validInput(),
      items: [validItem(), validItem()],
    });
    expect(r.success).toBe(false);
  });
});

describe("updateDeliveryOrderSchema（partial）", () => {
  it("空对象通过", () => {
    expect(updateDeliveryOrderSchema.safeParse({}).success).toBe(true);
  });

  it("只更新 status 通过", () => {
    expect(
      updateDeliveryOrderSchema.safeParse({ status: "received" }).success
    ).toBe(true);
  });

  it("更新 items 仍受校验（空数组失败）", () => {
    expect(updateDeliveryOrderSchema.safeParse({ items: [] }).success).toBe(
      false
    );
  });
});
