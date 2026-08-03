"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntityPicker } from "@/components/features/entity-picker";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

// 明细行
interface ItemRow {
  key: number; // 本地行标识（用于 React key）
  productId: number;
  productName: string;
  quantity: number;
  price: number;
}

interface SalesFormProps {
  mode: "create" | "edit";
  orderId?: number;
  initialCustomer?: { id: number; name: string } | null;
  initialItems?: { productId: number; productName: string; quantity: number; price: number }[];
  initialRemark?: string | null;
}

/**
 * 销售单表单（新建/编辑共用）：
 * 客户选择 + 多行商品明细编辑，提交 /api/sales 或 /api/sales/[id]
 */
export function SalesForm({
  mode,
  orderId,
  initialCustomer = null,
  initialItems = [],
  initialRemark = null,
}: SalesFormProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<{ id: number; name: string } | null>(initialCustomer);
  const [items, setItems] = useState<ItemRow[]>(
    initialItems.map((item, i) => ({ key: i + 1, ...item }))
  );
  const [remark, setRemark] = useState(initialRemark || "");
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [productPickerFor, setProductPickerFor] = useState<number | null>(null); // 正在选商品的行 key
  const [submitting, setSubmitting] = useState(false);

  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.price || 0),
    0
  );

  function addRow() {
    setItems((prev) => [
      ...prev,
      { key: Date.now(), productId: 0, productName: "", quantity: 0, price: 0 },
    ]);
  }

  function removeRow(key: number) {
    setItems((prev) => prev.filter((item) => item.key !== key));
  }

  function updateRow(key: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
    );
  }

  function handleProductSelected(item: { id: number; name: string }) {
    if (productPickerFor === null) return;
    updateRow(productPickerFor, { productId: item.id, productName: item.name });
    setProductPickerFor(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 前端基础校验
    if (!customer) {
      toast.error("请选择客户");
      return;
    }
    if (items.length === 0) {
      toast.error("请至少添加一条商品明细");
      return;
    }
    if (items.some((item) => !item.productId)) {
      toast.error("存在未选择商品的明细行");
      return;
    }
    if (items.some((item) => item.quantity <= 0)) {
      toast.error("商品数量必须大于 0");
      return;
    }
    if (items.some((item) => item.price < 0)) {
      toast.error("商品单价不能为负");
      return;
    }

    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/sales" : `/api/sales/${orderId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.id,
          remark: remark || null,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(mode === "create" ? "销售单创建成功" : "销售单更新成功");
        router.push("/sales");
      } else {
        toast.error(json.error || "提交失败");
      }
    } catch {
      toast.error("网络错误，提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 客户选择 */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <label className="block text-sm font-medium text-text mb-2">
          客户 <span className="text-danger">*</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 rounded-lg border border-border text-sm bg-bg min-w-[200px]">
            {customer ? customer.name : "未选择"}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCustomerPickerOpen(true)}
          >
            选择客户
          </Button>
        </div>
      </div>

      {/* 商品明细 */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-text">
            商品明细 <span className="text-danger">*</span>
          </label>
          <Button type="button" variant="secondary" size="sm" onClick={addRow}>
            + 添加明细
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-text-muted py-6 text-center border border-dashed border-border rounded-lg">
            暂无明细，点击「添加明细」选择商品
          </p>
        ) : (
          <div className="space-y-2">
            {/* 表头 */}
            <div className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-2 px-1 text-xs text-text-muted">
              <span>商品</span>
              <span>数量</span>
              <span>单价</span>
              <span className="text-right">小计</span>
              <span></span>
            </div>

            {items.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[1fr_100px_120px_100px_40px] gap-2 items-center"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="px-3 py-2 rounded-lg border border-border text-sm bg-bg truncate flex-1">
                    {item.productName || "未选择商品"}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setProductPickerFor(item.key)}
                  >
                    选择
                  </Button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.quantity || ""}
                  onChange={(e) =>
                    updateRow(item.key, { quantity: Number(e.target.value) })
                  }
                  placeholder="数量"
                  className="px-3 py-2 rounded-lg border border-border text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.price || ""}
                  onChange={(e) =>
                    updateRow(item.key, { price: Number(e.target.value) })
                  }
                  placeholder="单价"
                  className="px-3 py-2 rounded-lg border border-border text-sm w-full focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm font-medium text-right">
                  {formatCurrency(item.quantity * item.price)}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(item.key)}
                  className="text-danger hover:underline text-sm"
                >
                  删除
                </button>
              </div>
            ))}

            {/* 合计 */}
            <div className="flex justify-end gap-2 items-center pt-3 border-t border-border">
              <span className="text-sm text-text-muted">合计金额</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 备注 */}
      <div className="bg-surface rounded-xl border border-border p-4">
        <label className="block text-sm font-medium text-text mb-2">备注</label>
        <textarea
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="可填写配送要求、备注信息等"
          className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* 提交 */}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={submitting} disabled={items.length === 0}>
          {mode === "create" ? "创建销售单" : "保存修改"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          返回
        </Button>
      </div>

      {/* 客户选择器 */}
      <EntityPicker
        open={customerPickerOpen}
        onClose={() => setCustomerPickerOpen(false)}
        onSelect={setCustomer}
        title="选择客户"
        apiUrl="/api/customers"
      />

      {/* 商品选择器 */}
      <EntityPicker
        open={productPickerFor !== null}
        onClose={() => setProductPickerFor(null)}
        onSelect={handleProductSelected}
        title="选择商品"
        apiUrl="/api/products"
      />
    </form>
  );
}
