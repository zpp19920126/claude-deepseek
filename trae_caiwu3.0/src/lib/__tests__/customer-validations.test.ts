import { describe, it, expect } from "vitest";
import {
  createCustomerSchema,
  updateCustomerSchema,
} from "@/lib/validations";

// 构造一份合法的客户输入（测试用）
function validInput() {
  return {
    code: "K001",
    name: "阳光餐饮店",
    shortName: "阳光",
    phone: "13800138001",
    address: "城东区美食街12号",
    contact: "王老板",
    remark: "老客户",
  };
}

describe("createCustomerSchema", () => {
  it("合法输入通过校验", () => {
    const parsed = createCustomerSchema.safeParse(validInput());
    expect(parsed.success).toBe(true);
  });

  it("客户编码为空时失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      code: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("客户编码");
    }
  });

  it("客户编码超长（>20）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      code: "K".repeat(21),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("客户编码");
    }
  });

  it("客户编码含非法字符（中文）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      code: "客户001",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("客户编码");
    }
  });

  it("客户编码含非法字符（空格）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      code: "K 001",
    });
    expect(parsed.success).toBe(false);
  });

  it("客户编码合法字符（字母数字下划线连字符）通过", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      code: "K-001_A",
    });
    expect(parsed.success).toBe(true);
  });

  it("客户名称为空时失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      name: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("客户名称");
    }
  });

  it("客户名称超长（>50）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      name: "店".repeat(51),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("客户名称");
    }
  });

  it("客户简称可空（null）通过", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      shortName: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("客户简称可不传（undefined）通过", () => {
    const { shortName: _omitted, ...rest } = validInput();
    void _omitted;
    const parsed = createCustomerSchema.safeParse(rest);
    expect(parsed.success).toBe(true);
  });

  it("客户简称超长（>20）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      shortName: "阳".repeat(21),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("客户简称");
    }
  });

  it("电话可空（null）通过", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      phone: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("电话超长（>30）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      phone: "1".repeat(31),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("电话");
    }
  });

  it("地址可空（null）通过", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      address: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("地址超长（>200）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      address: "路".repeat(201),
    });
    expect(parsed.success).toBe(false);
  });

  it("联系人可空（null）通过", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      contact: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("联系人超长（>50）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      contact: "王".repeat(51),
    });
    expect(parsed.success).toBe(false);
  });

  it("备注可空（null）通过", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      remark: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("备注超长（>500）失败", () => {
    const parsed = createCustomerSchema.safeParse({
      ...validInput(),
      remark: "备".repeat(501),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("updateCustomerSchema（partial）", () => {
  it("空对象通过校验（允许部分更新）", () => {
    const parsed = updateCustomerSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("只更新 name 通过校验", () => {
    const parsed = updateCustomerSchema.safeParse({ name: "新名称" });
    expect(parsed.success).toBe(true);
  });

  it("只更新 code 仍受长度约束", () => {
    const parsed = updateCustomerSchema.safeParse({
      code: "K".repeat(21),
    });
    expect(parsed.success).toBe(false);
  });

  it("只更新 code 仍受正则约束", () => {
    const parsed = updateCustomerSchema.safeParse({
      code: "含中文的编码",
    });
    expect(parsed.success).toBe(false);
  });

  it("只更新 phone 为 null 通过（清空电话）", () => {
    const parsed = updateCustomerSchema.safeParse({ phone: null });
    expect(parsed.success).toBe(true);
  });

  it("只更新 shortName 为 null 通过（清空简称）", () => {
    const parsed = updateCustomerSchema.safeParse({ shortName: null });
    expect(parsed.success).toBe(true);
  });

  it("只更新 address 仍受长度约束", () => {
    const parsed = updateCustomerSchema.safeParse({
      address: "路".repeat(201),
    });
    expect(parsed.success).toBe(false);
  });
});
