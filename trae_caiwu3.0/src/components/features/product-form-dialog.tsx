"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntityPicker } from "@/components/features/entity-picker";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

// 商品关联实体（列表查询时 include 返回的结构）
interface ProductRelation {
  id: number;
  name: string;
}

export interface ProductWithRelations {
  id: number;
  sku: string;
  name: string;
  shortName: string | null;
  categoryId: number;
  unitId: number;
  supplierId: number | null;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  // Prisma 在 SQLite 下将枚举返回为 string，此处用 string 兼容
  status: string;
  remark: string | null;
  category: ProductRelation;
  unit: ProductRelation;
  supplier: ProductRelation | null;
}

interface FormState {
  sku: string;
  name: string;
  shortName: string;
  categoryId: number | null;
  categoryName: string;
  unitId: number | null;
  unitName: string;
  supplierId: number | null;
  supplierName: string;
  price: string;
  cost: string;
  minStock: string;
  status: "active" | "inactive";
  remark: string;
}

const initialForm: FormState = {
  sku: "",
  name: "",
  shortName: "",
  categoryId: null,
  categoryName: "",
  unitId: null,
  unitName: "",
  supplierId: null,
  supplierName: "",
  price: "0",
  cost: "0",
  minStock: "0",
  status: "active",
  remark: "",
};

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  // 传入商品数据时为编辑模式，否则为新增模式
  product?: ProductWithRelations | null;
}

/**
 * 商品新增/编辑表单弹窗
 * - 分类、单位、供应商使用 EntityPicker 弹窗选择
 * - 提交时调用 POST /api/products 或 PUT /api/products/[id]
 */
export function ProductFormDialog({
  open,
  onClose,
  product,
}: ProductFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // 弹窗打开或商品变化时同步表单
  useEffect(() => {
    if (!open) return;
    if (product) {
      setForm({
        sku: product.sku,
        name: product.name,
        shortName: product.shortName || "",
        categoryId: product.categoryId,
        categoryName: product.category?.name || "",
        unitId: product.unitId,
        unitName: product.unit?.name || "",
        supplierId: product.supplierId,
        supplierName: product.supplier?.name || "",
        price: String(product.price ?? 0),
        cost: String(product.cost ?? 0),
        minStock: String(product.minStock ?? 0),
        status: product.status === "inactive" ? "inactive" : "active",
        remark: product.remark || "",
      });
    } else {
      setForm(initialForm);
    }
  }, [open, product]);

  // 选择器弹窗状态
  const [pickerType, setPickerType] = useState<
    "category" | "unit" | "supplier" | null
  >(null);

  function updateField<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handlePickerSelect(
    type: "category" | "unit" | "supplier",
    item: { id: number; name: string }
  ) {
    if (type === "category") {
      updateField("categoryId", item.id);
      updateField("categoryName", item.name);
    } else if (type === "unit") {
      updateField("unitId", item.id);
      updateField("unitName", item.name);
    } else {
      updateField("supplierId", item.id);
      updateField("supplierName", item.name);
    }
  }

  async function handleSubmit() {
    // 前端基础校验
    if (!form.sku.trim()) {
      toast.error("商品编码不能为空");
      return;
    }
    if (!form.name.trim()) {
      toast.error("商品名称不能为空");
      return;
    }
    if (!form.categoryId) {
      toast.error("请选择商品分类");
      return;
    }
    if (!form.unitId) {
      toast.error("请选择基本单位");
      return;
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      shortName: form.shortName.trim() || null,
      categoryId: form.categoryId,
      unitId: form.unitId,
      supplierId: form.supplierId || null,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      minStock: Number(form.minStock) || 0,
      status: form.status,
      remark: form.remark.trim() || null,
    };

    setSubmitting(true);
    try {
      const isEdit = !!product;
      const url = isEdit
        ? `/api/products/${product!.id}`
        : "/api/products";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "商品更新成功" : "商品创建成功");
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

  const isEdit = !!product;

  return (
    <>
      <Modal
        open={open}
        onClose={() => !submitting && onClose()}
        title={isEdit ? "编辑商品" : "新增商品"}
        size="xl"
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
            label="商品编码"
            required
            placeholder="如：SP001"
            value={form.sku}
            onChange={(e) => updateField("sku", e.target.value)}
            disabled={submitting}
          />
          <Input
            label="商品名称"
            required
            placeholder="请输入商品名称"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            disabled={submitting}
          />
          <Input
            label="商品简称"
            placeholder="可选"
            value={form.shortName}
            onChange={(e) => updateField("shortName", e.target.value)}
            disabled={submitting}
          />

          {/* 商品分类选择器 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text">
              商品分类<span className="text-danger ml-0.5">*</span>
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                placeholder="请选择分类"
                value={form.categoryName}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setPickerType("category")}
                disabled={submitting}
              >
                选择
              </Button>
            </div>
          </div>

          {/* 基本单位选择器 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text">
              基本单位<span className="text-danger ml-0.5">*</span>
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                placeholder="请选择单位"
                value={form.unitName}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setPickerType("unit")}
                disabled={submitting}
              >
                选择
              </Button>
            </div>
          </div>

          {/* 默认供应商选择器 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text">
              默认供应商
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                placeholder="可选"
                value={form.supplierName}
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-text placeholder:text-text-muted"
              />
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setPickerType("supplier")}
                disabled={submitting}
              >
                选择
              </Button>
              {form.supplierId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    updateField("supplierId", null);
                    updateField("supplierName", "");
                  }}
                  disabled={submitting}
                >
                  清除
                </Button>
              )}
            </div>
          </div>

          <Input
            label="销售价"
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => updateField("price", e.target.value)}
            disabled={submitting}
          />
          <Input
            label="进货价"
            type="number"
            min="0"
            step="0.01"
            value={form.cost}
            onChange={(e) => updateField("cost", e.target.value)}
            disabled={submitting}
          />
          <Input
            label="最低库存"
            type="number"
            min="0"
            value={form.minStock}
            onChange={(e) => updateField("minStock", e.target.value)}
            disabled={submitting}
          />

          {/* 状态选择 */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-text">状态</label>
            <select
              value={form.status}
              onChange={(e) =>
                updateField(
                  "status",
                  e.target.value as "active" | "inactive"
                )
              }
              disabled={submitting}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="active">在售</option>
              <option value="inactive">停售</option>
            </select>
          </div>

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

      {/* 实体选择器弹窗 */}
      {pickerType && (
        <EntityPicker
          open={!!pickerType}
          onClose={() => setPickerType(null)}
          onSelect={(item) =>
            handlePickerSelect(pickerType, item)
          }
          title={
            pickerType === "category"
              ? "选择商品分类"
              : pickerType === "unit"
                ? "选择基本单位"
                : "选择默认供应商"
          }
          apiUrl={
            pickerType === "category"
              ? "/api/categories"
              : pickerType === "unit"
                ? "/api/units"
                : "/api/suppliers"
          }
        />
      )}
    </>
  );
}
