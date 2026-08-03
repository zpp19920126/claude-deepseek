"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface PurchaseRowOrder {
  id: number;
  orderNo: string;
  status: string;
  supplier: { name: string; shortName: string | null };
}

interface PurchaseRowActionsProps {
  order: PurchaseRowOrder;
  canDelete: boolean;
}

/**
 * 进货单表格行操作：详情 / 编辑（仅待收货）/ 打印 / 删除（仅管理员 + 待收货）
 */
export function PurchaseRowActions({ order, canDelete }: PurchaseRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPending = order.status === "pending";

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/purchases/${order.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("进货单删除成功");
        setDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(json.error || "删除失败");
      }
    } catch {
      toast.error("网络错误，删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sm whitespace-nowrap">
        <Link href={`/purchases/${order.id}`} className="text-primary hover:underline">
          详情
        </Link>
        <span className="text-border">|</span>
        {isPending && (
          <>
            <Link href={`/purchases/${order.id}/edit`} className="text-primary hover:underline">
              编辑
            </Link>
            <span className="text-border">|</span>
          </>
        )}
        <Link
          href={`/purchases/${order.id}/print`}
          target="_blank"
          className="text-text-muted hover:underline"
        >
          打印
        </Link>
        {canDelete && isPending && (
          <>
            <span className="text-border">|</span>
            <button
              onClick={() => setDeleteOpen(true)}
              className="text-danger hover:underline"
            >
              删除
            </button>
          </>
        )}
      </div>

      {/* 删除确认弹窗 */}
      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="确认删除"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          确定要删除进货单{" "}
          <span className="font-semibold">{order.orderNo}</span>（供应商：
          {order.supplier.shortName || order.supplier.name}）吗？此操作不可撤销。
        </p>
      </Modal>
    </>
  );
}
