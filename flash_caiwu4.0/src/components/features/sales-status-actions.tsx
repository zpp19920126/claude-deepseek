"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface SalesStatusActionsProps {
  order: { id: number; orderNo: string; status: string };
}

const ACTIONS: Record<string, { to: string; label: string; variant: "primary" | "danger" | "secondary" }[]> = {
  pending: [
    { to: "confirmed", label: "确认", variant: "primary" },
    { to: "cancelled", label: "取消", variant: "danger" },
  ],
  confirmed: [
    { to: "delivered", label: "配送", variant: "primary" },
    { to: "cancelled", label: "取消", variant: "danger" },
  ],
  delivered: [{ to: "paid", label: "收款", variant: "primary" }],
};

/**
 * 销售单详情页状态操作按钮组：按当前状态渲染可执行流转
 * 确认时扣减库存、取消已确认单时回补库存（由服务端处理）
 */
export function SalesStatusActions({ order }: SalesStatusActionsProps) {
  const router = useRouter();
  const [pendingTo, setPendingTo] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const actions = ACTIONS[order.status] || [];

  async function handleAction(to: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "操作成功");
        setConfirmCancelOpen(false);
        router.refresh();
      } else {
        toast.error(json.error || "操作失败");
      }
    } catch {
      toast.error("网络错误，操作失败");
    } finally {
      setSubmitting(false);
      setPendingTo(null);
    }
  }

  if (actions.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3">
        {actions.map((action) =>
          action.to === "cancelled" ? (
            <Button
              key={action.to}
              variant={action.variant}
              onClick={() => setConfirmCancelOpen(true)}
            >
              {action.label}
            </Button>
          ) : (
            <Button
              key={action.to}
              variant={action.variant}
              loading={submitting && pendingTo === action.to}
              disabled={submitting}
              onClick={() => {
                setPendingTo(action.to);
                handleAction(action.to);
              }}
            >
              {action.label}
            </Button>
          )
        )}
      </div>

      {/* 取消确认弹窗 */}
      <Modal
        open={confirmCancelOpen}
        onClose={() => !submitting && setConfirmCancelOpen(false)}
        title="确认取消"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmCancelOpen(false)}
              disabled={submitting}
            >
              返回
            </Button>
            <Button
              variant="danger"
              loading={submitting}
              onClick={() => {
                setPendingTo("cancelled");
                handleAction("cancelled");
              }}
            >
              确认取消
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          确定要取消销售单{" "}
          <span className="font-semibold">{order.orderNo}</span> 吗？
          {order.status === "confirmed" && "已扣减的库存将自动回补。"}
        </p>
      </Modal>
    </>
  );
}
