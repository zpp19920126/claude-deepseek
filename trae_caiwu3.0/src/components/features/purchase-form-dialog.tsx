"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { EntityPicker } from "@/components/features/entity-picker";

interface PurchaseItem {
  productId: number;
  productName: string;
  productSku: string;
  reservedQuantity: number;
  receivedQuantity: number;
  reservedUnitId: number;
  reservedUnitName: string;
  receivedUnitId: number;
  receivedUnitName: string;
  unitPrice: number;
}

interface PurchaseFormDialogProps {
  open: boolean;
  onClose: () => void;
  purchaseId?: number;
}

export function PurchaseFormDialog({ open, onClose, purchaseId }: PurchaseFormDialogProps) {
  const router = useRouter();
  const isEdit = !!purchaseId;
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [status, setStatus] = useState("pending");
  const [remark, setRemark] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);

  // 供应商选择器弹窗
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  // 商品选择器：记录当前操作的明细行索引
  const [productPickerOpen, setProductPickerOpen] = useState<number | null>(null);
  // 单位选择器临时状态
  const [unitPickerOpen, setUnitPickerOpen] = useState<
    { index: number; field: "reserved" | "received" } | null
  >(null);

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setSupplierId(null);
      setSupplierName("");
      setStatus("pending");
      setRemark("");
      setItems([]);
      return;
    }
    if (!purchaseId) return;
    setLoading(true);
    fetch(`/api/purchases/${purchaseId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setSupplierId(json.data.supplierId);
          setSupplierName(json.data.supplier?.name || "");
          setStatus(json.data.status);
          setRemark(json.data.remark || "");
          setItems(
            (json.data.items || []).map((it: Record<string, unknown>) => ({
              productId: it.productId as number,
              productName: (it.product as { name: string })?.name || "",
              productSku: (it.product as { sku: string })?.sku || "",
              reservedQuantity: it.reservedQuantity as number,
              receivedQuantity: it.receivedQuantity as number,
              reservedUnitId: it.reservedUnitId as number,
              reservedUnitName: (it.reservedUnit as { name: string })?.name || "",
              receivedUnitId: it.receivedUnitId as number,
              receivedUnitName: (it.receivedUnit as { name: string })?.name || "",
              unitPrice: it.unitPrice as number,
            }))
          );
        } else {
          toast.error(json.error || "加载进货单数据失败");
        }
      })
      .catch(() => {
        toast.error("网络错误，加载失败");
      })
      .finally(() => setLoading(false));
  }, [open, isEdit, purchaseId]);

  function addItem() {
    setItems([
      ...items,
      {
        productId: 0,
        productName: "",
        productSku: "",
        reservedQuantity: 0,
        receivedQuantity: 0,
        reservedUnitId: 0,
        reservedUnitName: "",
        receivedUnitId: 0,
        receivedUnitName: "",
        unitPrice: 0,
      },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof PurchaseItem, value: string | number) {
    setItems(items.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }

  async function handleSubmit() {
    if (!supplierId) {
      toast.error("请选择供应商");
      return;
    }
    if (items.length === 0) {
      toast.error("请至少添加一条明细");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        toast.error(`第 ${i + 1} 行请选择商品`);
        return;
      }
      if (!it.reservedUnitId) {
        toast.error(`第 ${i + 1} 行请选择预定单位`);
        return;
      }
      if (!it.receivedUnitId) {
        toast.error(`第 ${i + 1} 行请选择实收单位`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const url = isEdit ? `/api/purchases/${purchaseId}` : "/api/purchases";
      const method = isEdit ? "PUT" : "POST";
      const body: Record<string, unknown> = {
        supplierId,
        status,
        remark: remark || null,
        items: items.map((it) => ({
          productId: it.productId,
          reservedQuantity: it.reservedQuantity,
          receivedQuantity: it.receivedQuantity,
          reservedUnitId: it.reservedUnitId,
          receivedUnitId: it.receivedUnitId,
          unitPrice: it.unitPrice,
        })),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "进货单更新成功" : "进货单创建成功");
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
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title={isEdit ? `编辑进货单` : "新增进货单"}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            {isEdit ? "保存" : "创建"}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-center text-text-muted py-8">加载中...</p>
      ) : (
        <div className="space-y-4">
          {/* 供应商选择 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              供应商
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={supplierName}
                placeholder="请选择供应商"
                readOnly
                disabled={isEdit}
              />
              {!isEdit && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSupplierPickerOpen(true)}
                  disabled={submitting}
                >
                  选择
                </Button>
              )}
            </div>
            {isEdit && (
              <p className="text-xs text-text-muted mt-1">
                编辑模式下不可更改关联的供应商
              </p>
            )}
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">状态</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-surface text-sm"
            >
              <option value="pending">待收货</option>
              <option value="received">已入库</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          {/* 明细表格 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-text">明细</label>
              <Button size="sm" variant="secondary" onClick={addItem}>
                添加明细
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-center text-text-muted py-4 text-sm">
                暂无明细，点击&ldquo;添加明细&rdquo;
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg">
                      <th className="px-2 py-2 text-left">商品</th>
                      <th className="px-2 py-2 text-left">预定单位</th>
                      <th className="px-2 py-2 text-right">预定数量</th>
                      <th className="px-2 py-2 text-left">实收单位</th>
                      <th className="px-2 py-2 text-right">实收数量</th>
                      <th className="px-2 py-2 text-right">单价</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((it, index) => (
                      <tr key={index}>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            <Input
                              value={it.productName}
                              placeholder="选择商品"
                              readOnly
                              className="text-xs"
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setProductPickerOpen(index)}
                            >
                              选
                            </Button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => setUnitPickerOpen({ index, field: "reserved" })}
                            className="px-2 py-1 rounded border border-border text-xs hover:bg-bg"
                          >
                            {it.reservedUnitName || "选择"}
                          </button>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={it.reservedQuantity}
                            onChange={(e) => updateItem(index, "reservedQuantity", Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => setUnitPickerOpen({ index, field: "received" })}
                            className="px-2 py-1 rounded border border-border text-xs hover:bg-bg"
                          >
                            {it.receivedUnitName || "选择"}
                          </button>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={it.receivedQuantity}
                            onChange={(e) => updateItem(index, "receivedQuantity", Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={it.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                            className="w-20 text-right"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-danger text-xs hover:underline"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm font-medium text-text mb-1">备注</label>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="可选"
              disabled={submitting}
            />
          </div>
        </div>
      )}

      {/* 供应商选择器弹窗 */}
      {!isEdit && (
        <EntityPicker
          open={supplierPickerOpen}
          onClose={() => setSupplierPickerOpen(false)}
          onSelect={(item) => {
            setSupplierId(item.id);
            setSupplierName(item.name);
          }}
          title="选择供应商"
          apiUrl="/api/suppliers"
          labelField="name"
        />
      )}

      {/* 商品选择器弹窗（共享） */}
      {productPickerOpen !== null && (
        <EntityPicker
          open={true}
          onClose={() => setProductPickerOpen(null)}
          onSelect={(item) => {
            const idx = productPickerOpen;
            updateItem(idx, "productId", item.id);
            updateItem(idx, "productName", item.name);
            const sku = item.sku;
            if (typeof sku === "string") {
              updateItem(idx, "productSku", sku);
            }
            setProductPickerOpen(null);
          }}
          title="选择商品"
          apiUrl="/api/products"
          labelField="name"
          secondaryField="sku"
        />
      )}

      {/* 单位选择器弹窗 */}
      {unitPickerOpen && (
        <Modal
          open={true}
          onClose={() => setUnitPickerOpen(null)}
          title="选择单位"
          size="md"
        >
          <UnitPickerContent
            onSelect={(id, name) => {
              if (unitPickerOpen.field === "reserved") {
                updateItem(unitPickerOpen.index, "reservedUnitId", id);
                updateItem(unitPickerOpen.index, "reservedUnitName", name);
              } else {
                updateItem(unitPickerOpen.index, "receivedUnitId", id);
                updateItem(unitPickerOpen.index, "receivedUnitName", name);
              }
              setUnitPickerOpen(null);
            }}
          />
        </Modal>
      )}
    </Modal>
  );
}

// 单位选择内容
function UnitPickerContent({
  onSelect,
}: {
  onSelect: (id: number, name: string) => void;
}) {
  const [items, setItems] = useState<{ id: number; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/units?page=1&pageSize=100")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setItems(json.data.items || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center py-4">加载中...</p>;

  return (
    <div className="max-h-64 overflow-y-auto">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onSelect(it.id, it.name)}
          className="w-full text-left px-3 py-2 hover:bg-bg rounded text-sm"
        >
          {it.name} ({it.code})
        </button>
      ))}
    </div>
  );
}
