"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

// 客户行数据类型（与列表页 CustomerRow 对齐，但只包含表单需要的字段）
export interface CustomerFormData {
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

interface CustomerFormDialogProps {
  open: boolean;
  onClose: () => void;
  // 传入客户数据时为编辑模式，否则为新增模式
  customer?: CustomerFormData | null;
}

/**
 * 客户新增/编辑表单弹窗
 * - 提交时调用 POST /api/customers 或 PUT /api/customers/[id]
 */
export function CustomerFormDialog({
  open,
  onClose,
  customer,
}: CustomerFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开或客户变化时同步表单
  useEffect(() => {
    if (!open) return;
    if (customer) {
      setForm({
        code: customer.code,
        name: customer.name,
        shortName: customer.shortName || "",
        phone: customer.phone || "",
        address: customer.address || "",
        contact: customer.contact || "",
        remark: customer.remark || "",
      });
    } else {
      setForm(initialForm);
    }
  }, [open, customer]);

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    // 前端基础校验
    if (!form.code.trim()) {
      toast.error("客户编码不能为空");
      return;
    }
    if (!form.name.trim()) {
      toast.error("客户名称不能为空");
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
      const isEdit = !!customer;
      const url = isEdit
        ? `/api/customers/${customer!.id}`
        : "/api/customers";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "客户更新成功" : "客户创建成功");
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

  const isEdit = !!customer;

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={isEdit ? "编辑客户" : "新增客户"}
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
          label="客户编码"
          required
          placeholder="如：K001"
          value={form.code}
          onChange={(e) => updateField("code", e.target.value)}
          disabled={submitting || isEdit}
        />
        <Input
          label="客户名称"
          required
          placeholder="请输入客户名称"
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          disabled={submitting}
        />
        <Input
          label="客户简称"
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
