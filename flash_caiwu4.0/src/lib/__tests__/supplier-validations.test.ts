import { describe, it, expect } from "vitest";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/lib/validations";

// 构造一份合法的供应商输入（测试用）
function validInput() {
  return {
    code: "G001",
    name: "绿源蔬菜批发",
    shortName: "绿源",
    phone: "13900139001",
    address: "农批市场A区10号",
    contact: "孙老板",
    remark: "长期合作",
  };
}

describe("createSupplierSchema", () => {
  it("合法输入通过校验", () => {
    const parsed = createSupplierSchema.safeParse(validInput());
    expect(parsed.success).toBe(true);
  });

  it("供应商编码为空时失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      code: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("供应商编码");
    }
  });

  it("供应商编码超长（>20）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      code: "G".repeat(21),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("供应商编码");
    }
  });

  it("供应商编码含非法字符（中文）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      code: "供应商001",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("供应商编码");
    }
  });

  it("供应商编码含非法字符（空格）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      code: "G 001",
    });
    expect(parsed.success).toBe(false);
  });

  it("供应商编码合法字符（字母数字下划线连字符）通过", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      code: "G-001_A",
    });
    expect(parsed.success).toBe(true);
  });

  it("供应商名称为空时失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      name: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("供应商名称");
    }
  });

  it("供应商名称超长（>50）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      name: "店".repeat(51),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("供应商名称");
    }
  });

  it("供应商简称可空（null）通过", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      shortName: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("供应商简称可不传（undefined）通过", () => {
    const { shortName: _omitted, ...rest } = validInput();
    void _omitted;
    const parsed = createSupplierSchema.safeParse(rest);
    expect(parsed.success).toBe(true);
  });

  it("供应商简称超长（>20）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      shortName: "绿".repeat(21),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("供应商简称");
    }
  });

  it("电话可空（null）通过", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      phone: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("电话超长（>30）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      phone: "1".repeat(31),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("电话");
    }
  });

  it("地址可空（null）通过", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      address: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("地址超长（>200）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      address: "路".repeat(201),
    });
    expect(parsed.success).toBe(false);
  });

  it("联系人可空（null）通过", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      contact: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("联系人超长（>50）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      contact: "孙".repeat(51),
    });
    expect(parsed.success).toBe(false);
  });

  it("备注可空（null）通过", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      remark: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("备注超长（>500）失败", () => {
    const parsed = createSupplierSchema.safeParse({
      ...validInput(),
      remark: "备".repeat(501),
    });
    expect(parsed.success).toBe(false);
  });
});

describe("updateSupplierSchema（partial）", () => {
  it("空对象通过校验（允许部分更新）", () => {
    const parsed = updateSupplierSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("只更新 name 通过校验", () => {
    const parsed = updateSupplierSchema.safeParse({ name: "新名称" });
    expect(parsed.success).toBe(true);
  });

  it("只更新 code 仍受长度约束", () => {
    const parsed = updateSupplierSchema.safeParse({
      code: "G".repeat(21),
    });
    expect(parsed.success).toBe(false);
  });

  it("只更新 code 仍受正则约束", () => {
    const parsed = updateSupplierSchema.safeParse({
      code: "含中文的编码",
    });
    expect(parsed.success).toBe(false);
  });

  it("只更新 phone 为 null 通过（清空电话）", () => {
    const parsed = updateSupplierSchema.safeParse({ phone: null });
    expect(parsed.success).toBe(true);
  });

  it("只更新 shortName 为 null 通过（清空简称）", () => {
    const parsed = updateSupplierSchema.safeParse({ shortName: null });
    expect(parsed.success).toBe(true);
  });

  it("只更新 address 仍受长度约束", () => {
    const parsed = updateSupplierSchema.safeParse({
      address: "路".repeat(201),
    });
    expect(parsed.success).toBe(false);
  });
});
