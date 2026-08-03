import { describe, it, expect } from "vitest";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/validations";

// 构造一份合法的分类输入（测试用）
function validInput() {
  return {
    code: "C001",
    name: "叶菜类",
    shortName: "叶菜",
    sortOrder: 1,
  };
}

describe("createCategorySchema", () => {
  it("合法输入通过校验", () => {
    const parsed = createCategorySchema.safeParse(validInput());
    expect(parsed.success).toBe(true);
  });

  it("分类编码为空时失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      code: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("分类编码");
    }
  });

  it("分类编码超长（>20）失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      code: "C".repeat(21),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("分类编码");
    }
  });

  it("分类编码含非法字符（中文）失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      code: "分类001",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("分类编码");
    }
  });

  it("分类编码含非法字符（空格）失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      code: "C 001",
    });
    expect(parsed.success).toBe(false);
  });

  it("分类编码合法字符（字母数字下划线连字符）通过", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      code: "C-001_A",
    });
    expect(parsed.success).toBe(true);
  });

  it("分类名称为空时失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      name: "",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("分类名称");
    }
  });

  it("分类名称超长（>50）失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      name: "叶".repeat(51),
    });
    expect(parsed.success).toBe(false);
  });

  it("分类简称可空（null）通过", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      shortName: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("分类简称可不传（undefined）通过", () => {
    const { shortName: _omitted, ...rest } = validInput();
    void _omitted;
    const parsed = createCategorySchema.safeParse(rest);
    expect(parsed.success).toBe(true);
  });

  it("分类简称超长（>20）失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      shortName: "叶".repeat(21),
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.errors[0]?.message).toContain("分类简称");
    }
  });

  it("sortOrder 默认值为 0", () => {
    const { sortOrder: _omitted, ...rest } = validInput();
    void _omitted;
    const parsed = createCategorySchema.safeParse(rest);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sortOrder).toBe(0);
    }
  });

  it("sortOrder 非整数失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      sortOrder: 1.5,
    });
    expect(parsed.success).toBe(false);
  });

  it("sortOrder 负数失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      sortOrder: -1,
    });
    expect(parsed.success).toBe(false);
  });

  it("parentId 可选为 null 通过（顶级分类）", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      parentId: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("parentId 非正数失败", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      parentId: 0,
    });
    expect(parsed.success).toBe(false);
  });

  it("parentId 正数通过", () => {
    const parsed = createCategorySchema.safeParse({
      ...validInput(),
      parentId: 5,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("updateCategorySchema（partial）", () => {
  it("空对象通过校验（允许部分更新）", () => {
    const parsed = updateCategorySchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("只更新 name 通过校验", () => {
    const parsed = updateCategorySchema.safeParse({ name: "新名称" });
    expect(parsed.success).toBe(true);
  });

  it("只更新 code 仍受长度约束", () => {
    const parsed = updateCategorySchema.safeParse({
      code: "C".repeat(21),
    });
    expect(parsed.success).toBe(false);
  });

  it("只更新 code 仍受正则约束", () => {
    const parsed = updateCategorySchema.safeParse({
      code: "含中文的编码",
    });
    expect(parsed.success).toBe(false);
  });

  it("只更新 sortOrder 仍受整数约束", () => {
    const parsed = updateCategorySchema.safeParse({ sortOrder: 2.5 });
    expect(parsed.success).toBe(false);
  });

  it("只更新 shortName 为 null 通过（清空简称）", () => {
    const parsed = updateCategorySchema.safeParse({ shortName: null });
    expect(parsed.success).toBe(true);
  });
});
