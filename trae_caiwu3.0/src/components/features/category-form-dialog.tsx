"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

// 分类行数据类型（与列表页 CategoryRow 对齐，但只包含表单需要的字段）
export interface CategoryFormData {
  id: number;
  code: string;
  name: string;
  shortName: string | null;
  sortOrder: number;
}

interface FormState {
  code: string;
  name: string;
  shortName: string;
  sortOrder: string;
}

const initialForm: FormState = {
  code: "",
  name: "",
  shortName: "",
  sortOrder: "0",
};

interface CategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  // 传入分类数据时为编辑模式，否则为新增模式
  category?: CategoryFormData | null;
}

/**
 * 分类新增/编辑表单弹窗
 * - 提交时调用 POST /api/categories 或 PUT /api/categories/[id]
 */
export function CategoryFormDialog({
  open,
  onClose,
  category,
}: CategoryFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开或分类变化时同步表单
  useEffect(() => {
    if (!open) return;
    if (category) {
      setForm({
        code: category.code,
        name: category.name,
        shortName: category.shortName || "",
        sortOrder: String(category.sortOrder ?? 0),
      });
    } else {
      setForm(initialForm);
    }
  }, [open, category]);

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    // 前端基础校验
    if (!form.code.trim()) {
      toast.error("分类编码不能为空");
      return;
    }
    if (!form.name.trim()) {
      toast.error("分类名称不能为空");
      return;
    }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      shortName: form.shortName.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
    };

    setSubmitting(true);
    try {
      const isEdit = !!category;
      const url = isEdit
        ? `/api/categories/${category!.id}`
        : "/api/categories";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "分类更新成功" : "分类创建成功");
        onClose();
        router.refresh();
      } else {
        toast.error(json.error || "操作失败");
      }
    } catch {
      toast.error("网络错误，操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = !!category;

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={isEdit ? "编辑分类" : "新增分类"}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            确定
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="分类编码"
          required
          placeholder="如：C001"
          value={form.code}
          onChange={(e) => updateField("code", e.target.value)}
          disabled={submitting}
        />
        <Input
          label="分类名称"
          required
          placeholder="请输入分类名称"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          disabled={submitting}
        />
        <Input
          label="分类简称"
          placeholder="可选"
          value={form.shortName}
          onChange={(e) => updateField("shortName", e.target.value)}
          disabled={submitting}
        />
        <Input
          label="排序"
          type="number"
          min="0"
          step="1"
          value={form.sortOrder}
          onChange={(e) => updateField("sortOrder", e.target.value)}
          disabled={submitting}
        />
      </div>
    </Modal>
  );
}
