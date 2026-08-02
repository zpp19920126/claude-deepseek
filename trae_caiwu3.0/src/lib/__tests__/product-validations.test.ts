import { describe, it, expect } from "vitest";
import { createProductSchema, updateProductSchema } from "@/lib/validations";

// 构造一份合法的商品输入（测试用）
function validInput() {
  return {
    sku: "SP001",
    name: "白菜",
    shortName: "白菜",
    categoryId: 1,
    unitId: 1,
    supplierId: 2,
    price: 2.5,
    cost: 1.8,
    minStock: 50,
    status: "active" as const,
    remark: "测试备注",
  };
}

describe("createProductSchema", () => {
  it("合法输入通过校验", () => {
    const parsed = createProductSchema.safeParse(validInput());
    expect(parsed.success).toBe(true);
  });

  it("商品编码为空时失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      sku: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("商品编码");
    }
  });

  it("商品编码超长（>50）失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      sku: "A".repeat(51),
    });
    expect(parsed.success).toBe(false);
  });

  it("商品名称为空时失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      name: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("categoryId 非正数时失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      categoryId: 0,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("商品分类");
    }
  });

  it("unitId 非正数时失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      unitId: -1,
    });
    expect(parsed.success).toBe(false);
  });

  it("销售价为负数时失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      price: -1,
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("销售价");
    }
  });

  it("进货价为负数时失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      cost: -0.01,
    });
    expect(parsed.success).toBe(false);
  });

  it("最低库存为负数时失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      minStock: -1,
    });
    expect(parsed.success).toBe(false);
  });

  it("status 非 active/inactive 时失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      status: "unknown" as never,
    });
    expect(parsed.success).toBe(false);
  });

  it("supplierId 可选为 null（无默认供应商）", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      supplierId: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("shortName 可选为 null", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      shortName: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("price/cost/minStock 默认值为 0", () => {
    const parsed = createProductSchema.safeParse({
      sku: "SP002",
      name: "萝卜",
      categoryId: 1,
      unitId: 1,
      status: "active",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.price).toBe(0);
      expect(parsed.data.cost).toBe(0);
      expect(parsed.data.minStock).toBe(0);
    }
  });

  it("备注超长（>500）失败", () => {
    const parsed = createProductSchema.safeParse({
      ...validInput(),
      remark: "A".repeat(501),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("updateProductSchema（partial）", () => {
  it("空对象通过校验（允许部分更新）", () => {
    const parsed = updateProductSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("只更新 name 通过校验", () => {
    const parsed = updateProductSchema.safeParse({ name: "新名称" });
    expect(parsed.success).toBe(true);
  });

  it("只更新 sku 仍受长度约束", () => {
    const parsed = updateProductSchema.safeParse({
      sku: "B".repeat(51),
    });
    expect(parsed.success).toBe(false);
  });

  it("只更新 price 仍受非负约束", () => {
    const parsed = updateProductSchema.safeParse({ price: -5 });
    expect(parsed.success).toBe(false);
  });
});
