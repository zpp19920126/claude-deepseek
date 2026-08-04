"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EntityPicker } from "@/components/features/entity-picker";
import { toast } from "@/components/ui/toast";

interface SalesFormDialogProps {
  open: boolean;
  onClose: () => void;
  // 传入 salesId 时为编辑模式（仅备注可改），否则为新增模式
  salesId?: number;
}

export function SalesFormDialog({
  open,
  onClose,
  salesId,
}: SalesFormDialogProps) {
  const router = useRouter();
  const isEdit = !!salesId;

  const [deliveryOrderId, setDeliveryOrderId] = useState<number | null>(null);
  const [deliveryOrderNo, setDeliveryOrderNo] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 编辑模式：加载现有销售单数据
  useEffect(() => {
    if (!open || !salesId) return;
    setLoading(true);
    fetch(`/api/sales/${salesId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setDeliveryOrderId(json.data.deliveryOrderId);
          setDeliveryOrderNo(json.data.deliveryOrder?.orderNo || "");
          setRemark(json.data.remark || "");
        } else {
          toast.error(json.error || "加载销售单数据失败");
        }
      })
      .catch(() => {
        toast.error("网络错误，加载失败");
      })
      .finally(() => setLoading(false));
  }, [open, salesId]);

  function reset() {
    setDeliveryOrderId(null);
    setDeliveryOrderNo("");
    setRemark("");
  }

  async function handleSubmit() {
    if (!isEdit && !deliveryOrderId) {
      toast.error("请选择配送单");
      return;
    }
    setSubmitting(true);
    try {
      const url = isEdit ? `/api/sales/${salesId}` : "/api/sales";
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { remark }
        : { deliveryOrderId, remark: remark || undefined };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "销售单更新成功" : "销售单创建成功");
        reset();
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
      title={isEdit ? "编辑销售单" : "新增销售单"}
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
        <div className="py-8 text-center text-text-muted">加载中...</div>
      ) : (
        <div className="space-y-4">
          {/* 配送单选择（仅新增模式可选） */}
          <div>
            <label className="block text-sm text-text-muted mb-1">
              配送单单据编号 {!isEdit && <span className="text-red-500">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={deliveryOrderNo}
                placeholder="请选择配送单"
                readOnly
                className="cursor-pointer"
                disabled={isEdit}
              />
              {!isEdit && (
                <Button
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  disabled={submitting}
                >
                  选择
                </Button>
              )}
            </div>
            {isEdit && (
              <p className="text-xs text-text-muted mt-1">
                编辑模式下不可更改关联的配送单
              </p>
            )}
          </div>

          {/* 备注 */}
          <div>
            <label className="block text-sm text-text-muted mb-1">备注</label>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="可选"
              disabled={submitting}
            />
          </div>
        </div>
      )}

      {/* 配送单选择器（仅新增模式） */}
      {!isEdit && (
        <EntityPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(item) => {
            // 配送单 API 返回字段为 orderNo/customerName（无 name），
            // 此处从完整 item 中取 orderNo 作为单据编号回填输入框
            setDeliveryOrderId(item.id);
            setDeliveryOrderNo(item.orderNo as string);
          }}
          title="选择配送单"
          apiUrl="/api/delivery-orders"
          labelField="orderNo"
          secondaryField="customerName"
        />
      )}
    </Modal>
  );
}
