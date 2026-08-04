"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { PurchaseFormDialog } from "@/components/features/purchase-form-dialog";

interface PurchaseRowActionsProps {
  purchase: {
    id: number;
    orderNo: string;
  };
}

export function PurchaseRowActions({ purchase }: PurchaseRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/purchases/${purchase.id}`, {
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
      <div className="flex items-center gap-2">
        <Link
          href={`/purchases/${purchase.id}`}
          className="text-primary hover:underline text-sm"
        >
          查看
        </Link>
        <span className="text-border">|</span>
        <button
          onClick={() => setEditOpen(true)}
          className="text-primary hover:underline text-sm"
        >
          编辑
        </button>
        <span className="text-border">|</span>
        <button
          onClick={() => setDeleteOpen(true)}
          className="text-danger hover:underline text-sm"
        >
          删除
        </button>
      </div>

      <PurchaseFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        purchaseId={purchase.id}
      />

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
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
            >
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          确定要删除进货单{" "}
          <span className="font-semibold">{purchase.orderNo}</span>{" "}
          吗？此操作不可撤销，关联的明细将被级联删除。
        </p>
      </Modal>
    </>
  );
}
