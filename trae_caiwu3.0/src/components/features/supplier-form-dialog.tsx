"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

// 供应商行数据类型（与列表页 SupplierRow 对齐，但只包含表单需要的字段）
export interface SupplierFormData {
  id: number;
  code: string;
  name: string;
  shortName: string | null;
  phone: string | null;
  address: string | null;
  contact: string | null;
  remark: string | null;
}

interface FormState {
  code: string;
  name: string;
  shortName: string;
  phone: string;
  address: string;
  contact: string;
  remark: string;
}

const initialForm: FormState = {
  code: "",
  name: "",
  shortName: "",
  phone: "",
  address: "",
  contact: "",
  remark: "",
};

interface SupplierFormDialogProps {
  open: boolean;
  onClose: () => void;
  // 传入供应商数据时为编辑模式，否则为新增模式
  supplier?: SupplierFormData | null;
}

/**
 * 供应商新增/编辑表单弹窗
 * - 提交时调用 POST /api/suppliers 或 PUT /api/suppliers/[id]
 */
export function SupplierFormDialog({
  open,
  onClose,
  supplier,
}: SupplierFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (supplier) {
      setForm({
        code: supplier.code,
        name: supplier.name,
        shortName: supplier.shortName || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        contact: supplier.contact || "",
        remark: supplier.remark || "",
      });
    } else {
      setForm(initialForm);
    }
  }, [open, supplier]);

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.code.trim()) {
      toast.error("供应商编码不能为空");
      return;
    }
    if (!form.name.trim()) {
      toast.error("供应商名称不能为空");
      return;
    }

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      shortName: form.shortName.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      contact: form.contact.trim() || null,
      remark: form.remark.trim() || null,
    };

    setSubmitting(true);
    try {
      const isEdit = !!supplier;
      const url = isEdit
        ? `/api/suppliers/${supplier!.id}`
        : "/api/suppliers";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "供应商更新成功" : "供应商创建成功");
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

  const isEdit = !!supplier;

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={isEdit ? "编辑供应商" : "新增供应商"}
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
          label="供应商编码"
          required
          placeholder="如：G001"
          value={form.code}
          onChange={(e) => updateField("code", e.target.value)}
          disabled={submitting || isEdit}
        />
        <Input
          label="供应商名称"
          required
          placeholder="请输入供应商名称"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          disabled={submitting}
        />
        <Input
          label="供应商简称"
          placeholder="可选"
          value={form.shortName}
          onChange={(e) => updateField("shortName", e.target.value)}
          disabled={submitting}
        />
        <Input
          label="联系人"
          placeholder="可选"
          value={form.contact}
          onChange={(e) => updateField("contact", e.target.value)}
          disabled={submitting}
        />
        <Input
          label="电话"
          placeholder="可选"
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          disabled={submitting}
        />
        <Input
          label="地址"
          placeholder="可选"
          value={form.address}
          onChange={(e) => updateField("address", e.target.value)}
          disabled={submitting}
        />
        <div className="md:col-span-2">
          <Input
            label="备注"
            placeholder="可选"
            value={form.remark}
            onChange={(e) => updateField("remark", e.target.value)}
            disabled={submitting}
          />
        </div>
      </div>
    </Modal>
  );
}
