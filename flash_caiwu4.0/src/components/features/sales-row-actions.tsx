"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface SalesRowOrder {
  id: number;
  orderNo: string;
  status: string;
  customer: { name: string; shortName: string | null };
}

interface SalesRowActionsProps {
  order: SalesRowOrder;
  canDelete: boolean;
}

/**
 * 销售单表格行操作：详情 / 编辑（仅待确认）/ 打印 / 删除（仅管理员 + 待确认）
 */
export function SalesRowActions({ order, canDelete }: SalesRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPending = order.status === "pending";

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sales/${order.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("销售单删除成功");
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
        <Link href={`/sales/${order.id}`} className="text-primary hover:underline">
          详情
        </Link>
        <span className="text-border">|</span>
        {isPending && (
          <>
            <Link href={`/sales/${order.id}/edit`} className="text-primary hover:underline">
              编辑
            </Link>
            <span className="text-border">|</span>
          </>
        )}
        <Link
          href={`/sales/${order.id}/print`}
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
          确定要删除销售单{" "}
          <span className="font-semibold">{order.orderNo}</span>（客户：
          {order.customer.shortName || order.customer.name}）吗？此操作不可撤销。
        </p>
      </Modal>
    </>
  );
}
