"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { EntityPicker } from "@/components/features/entity-picker";
import { DELIVERY_ORDER_STATUS } from "@/types";

// 明细行表单状态（数量/单价用 string 便于受控输入，提交时转 number）
interface DeliveryOrderItemForm {
  productId: number | null;
  productName: string;
  reservedUnitId: number | null;
  reservedUnitName: string;
  reservedQuantity: string;
  deliveryUnitId: number | null;
  deliveryUnitName: string;
  deliveryQuantity: string;
  receivedQuantity: string;
  unitPrice: string;
}

interface FormState {
  customerId: number | null;
  customerName: string;
  status: string;
  remark: string;
  items: DeliveryOrderItemForm[];
}

const emptyItem: DeliveryOrderItemForm = {
  productId: null,
  productName: "",
  reservedUnitId: null,
  reservedUnitName: "",
  reservedQuantity: "",
  deliveryUnitId: null,
  deliveryUnitName: "",
  deliveryQuantity: "",
  receivedQuantity: "",
  unitPrice: "",
};

const initialForm: FormState = {
  customerId: null,
  customerName: "",
  status: "pending",
  remark: "",
  items: [{ ...emptyItem }],
};

interface DeliveryOrderFormDialogProps {
  open: boolean;
  onClose: () => void;
  // 传入 orderId 时为编辑模式，否则为新增模式
  orderId?: number;
}

// 当前激活的实体选择器（同一时间只打开一个）
type ActivePicker =
  | { type: "customer" }
  | { type: "product"; index: number }
  | { type: "reservedUnit"; index: number }
  | { type: "deliveryUnit"; index: number }
  | null;

// 编辑模式加载的明细数据类型（来自 GET /api/delivery-orders/[id]）
interface LoadedItem {
  productId: number;
  product?: { name?: string };
  reservedUnitId: number;
  reservedUnit?: { name?: string };
  reservedQuantity: number;
  deliveryUnitId: number;
  deliveryUnit?: { name?: string };
  deliveryQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
}

interface LoadedOrder {
  customerId: number;
  customer?: { name?: string };
  status: string;
  remark?: string | null;
  items?: LoadedItem[];
}

/**
 * 销售配送单新增/编辑表单弹窗
 * - 客户选择、状态、备注构成单据头
 * - 明细行动态增删，每行的商品/单位均通过 EntityPicker 弹窗选择
 * - 提交时调用 POST /api/delivery-orders 或 PUT /api/delivery-orders/[id]
 */
export function DeliveryOrderFormDialog({
  open,
  onClose,
  orderId,
}: DeliveryOrderFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  const isEdit = !!orderId;

  // 弹窗打开时：编辑模式拉取详情，新增模式重置表单
  useEffect(() => {
    if (!open) return;
    if (!orderId) {
      setForm(initialForm);
      return;
    }
    setLoading(true);
    fetch(`/api/delivery-orders/${orderId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const o = json.data as LoadedOrder;
          setForm({
            customerId: o.customerId,
            customerName: o.customer?.name || "",
            status: o.status,
            remark: o.remark || "",
            items:
              (o.items || []).length > 0
                ? o.items!.map((it) => ({
                    productId: it.productId,
                    productName: it.product?.name || "",
                    reservedUnitId: it.reservedUnitId,
                    reservedUnitName: it.reservedUnit?.name || "",
                    reservedQuantity: String(it.reservedQuantity ?? ""),
                    deliveryUnitId: it.deliveryUnitId,
                    deliveryUnitName: it.deliveryUnit?.name || "",
                    deliveryQuantity: String(it.deliveryQuantity ?? ""),
                    receivedQuantity: String(it.receivedQuantity ?? ""),
                    unitPrice: String(it.unitPrice ?? ""),
                  }))
                : [{ ...emptyItem }],
          });
        } else {
          toast.error(json.error || "加载配送单失败");
        }
      })
      .catch(() => toast.error("网络错误，加载配送单失败"))
      .finally(() => setLoading(false));
  }, [open, orderId]);

  function updateItem<K extends keyof DeliveryOrderItemForm>(
    index: number,
    key: K,
    value: DeliveryOrderItemForm[K]
  ) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === index ? { ...it, [key]: value } : it
      ),
    }));
  }

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  }

  function removeItem(index: number) {
    setForm((f) => ({
      ...f,
      items:
        f.items.length > 1
          ? f.items.filter((_, i) => i !== index)
          : f.items,
    }));
  }

  function handleSelectCustomer(item: { id: number; name: string }) {
    setForm((f) => ({ ...f, customerId: item.id, customerName: item.name }));
  }

  function handleSelectProduct(index: number, item: { id: number; name: string }) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === index
          ? { ...it, productId: item.id, productName: item.name }
          : it
      ),
    }));
  }

  function handleSelectReservedUnit(
    index: number,
    item: { id: number; name: string }
  ) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === index
          ? { ...it, reservedUnitId: item.id, reservedUnitName: item.name }
          : it
      ),
    }));
  }

  function handleSelectDeliveryUnit(
    index: number,
    item: { id: number; name: string }
  ) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) =>
        i === index
          ? { ...it, deliveryUnitId: item.id, deliveryUnitName: item.name }
          : it
      ),
    }));
  }

  async function handleSubmit() {
    if (!form.customerId) {
      toast.error("请选择客户");
      return;
    }
    if (form.items.length === 0) {
      toast.error("至少添加一条明细");
      return;
    }
    for (const it of form.items) {
      if (!it.productId) {
        toast.error("请选择所有明细行的商品");
        return;
      }
      if (!it.reservedUnitId) {
        toast.error("请选择所有明细行的预定单位");
        return;
      }
      if (!it.deliveryUnitId) {
        toast.error("请选择所有明细行的配送单位");
        return;
      }
    }

    const payload = {
      customerId: form.customerId,
      status: form.status,
      remark: form.remark.trim() || null,
      items: form.items.map((it) => ({
        productId: it.productId as number,
        reservedUnitId: it.reservedUnitId as number,
        reservedQuantity: Number(it.reservedQuantity) || 0,
        deliveryUnitId: it.deliveryUnitId as number,
        deliveryQuantity: Number(it.deliveryQuantity) || 0,
        receivedQuantity: Number(it.receivedQuantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
      })),
    };

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/delivery-orders/${orderId}`
        : "/api/delivery-orders";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "配送单更新成功" : "配送单创建成功");
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

  return (
    <>
      <Modal
        open={open}
        onClose={() => !submitting && onClose()}
        title={isEdit ? "编辑配送单" : "新增配送单"}
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
        {loading ? (
          <p className="text-center text-sm text-text-muted py-8">
            加载中...
          </p>
        ) : (
          <div className="space-y-4">
            {/* 单据头：客户 / 状态 / 备注 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text">
                  客户<span className="text-danger ml-0.5">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    placeholder="请选择客户"
                    value={form.customerName}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setActivePicker({ type: "customer" })}
                  >
                    选择
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text">
                  状态
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {Object.entries(DELIVERY_ORDER_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="备注"
                placeholder="可选"
                value={form.remark}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remark: e.target.value }))
                }
                disabled={submitting}
              />
            </div>

            {/* 明细列表 */}
            <div className="border border-border rounded-lg overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead className="bg-bg border-b border-border">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-text-muted whitespace-nowrap">
                      商品
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-text-muted whitespace-nowrap">
                      预定单位
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-text-muted whitespace-nowrap">
                      预定数量
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-text-muted whitespace-nowrap">
                      配送单位
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-text-muted whitespace-nowrap">
                      配送数量
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-text-muted whitespace-nowrap">
                      实收数量
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-text-muted whitespace-nowrap">
                      单价
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-text-muted whitespace-nowrap">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {form.items.map((it, index) => (
                    <tr key={index}>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            readOnly
                            placeholder="选择商品"
                            value={it.productName}
                            className="w-32 px-2 py-1 text-sm rounded border border-border bg-bg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setActivePicker({ type: "product", index })
                            }
                            className="text-xs text-primary hover:underline whitespace-nowrap"
                          >
                            选
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            readOnly
                            placeholder="单位"
                            value={it.reservedUnitName}
                            className="w-20 px-2 py-1 text-sm rounded border border-border bg-bg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setActivePicker({
                                type: "reservedUnit",
                                index,
                              })
                            }
                            className="text-xs text-primary hover:underline whitespace-nowrap"
                          >
                            选
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.reservedQuantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "reservedQuantity",
                              e.target.value
                            )
                          }
                          className="w-20 px-2 py-1 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            readOnly
                            placeholder="单位"
                            value={it.deliveryUnitName}
                            className="w-20 px-2 py-1 text-sm rounded border border-border bg-bg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setActivePicker({
                                type: "deliveryUnit",
                                index,
                              })
                            }
                            className="text-xs text-primary hover:underline whitespace-nowrap"
                          >
                            选
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.deliveryQuantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "deliveryQuantity",
                              e.target.value
                            )
                          }
                          className="w-20 px-2 py-1 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.receivedQuantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "receivedQuantity",
                              e.target.value
                            )
                          }
                          className="w-20 px-2 py-1 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={it.unitPrice}
                          onChange={(e) =>
                            updateItem(index, "unitPrice", e.target.value)
                          }
                          className="w-20 px-2 py-1 text-sm rounded border border-border focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={form.items.length <= 1 || submitting}
                          className="text-xs text-danger hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button size="sm" variant="secondary" onClick={addItem} disabled={submitting}>
              + 添加明细
            </Button>
          </div>
        )}
      </Modal>

      {/* 实体选择器：客户 / 商品 / 预定单位 / 配送单位 */}
      <EntityPicker
        open={activePicker?.type === "customer"}
        onClose={() => setActivePicker(null)}
        onSelect={(item) => {
          const ap = activePicker;
          if (ap?.type === "customer") {
            handleSelectCustomer(item);
          }
        }}
        title="选择客户"
        apiUrl="/api/customers"
      />
      <EntityPicker
        open={activePicker?.type === "product"}
        onClose={() => setActivePicker(null)}
        onSelect={(item) => {
          const ap = activePicker;
          if (ap?.type === "product") {
            handleSelectProduct(ap.index, item);
          }
        }}
        title="选择商品"
        apiUrl="/api/products"
      />
      <EntityPicker
        open={activePicker?.type === "reservedUnit"}
        onClose={() => setActivePicker(null)}
        onSelect={(item) => {
          const ap = activePicker;
          if (ap?.type === "reservedUnit") {
            handleSelectReservedUnit(ap.index, item);
          }
        }}
        title="选择预定单位"
        apiUrl="/api/units"
      />
      <EntityPicker
        open={activePicker?.type === "deliveryUnit"}
        onClose={() => setActivePicker(null)}
        onSelect={(item) => {
          const ap = activePicker;
          if (ap?.type === "deliveryUnit") {
            handleSelectDeliveryUnit(ap.index, item);
          }
        }}
        title="选择配送单位"
        apiUrl="/api/units"
      />
    </>
  );
}
