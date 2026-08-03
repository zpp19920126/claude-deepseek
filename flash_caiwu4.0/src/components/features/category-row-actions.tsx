"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import {
  CategoryFormDialog,
  type CategoryFormData,
} from "@/components/features/category-form-dialog";

interface CategoryRowActionsProps {
  category: CategoryFormData & { productCount?: number };
}

/**
 * 分类表格行操作按钮：编辑 + 删除
 */
export function CategoryRowActions({ category }: CategoryRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("分类删除成功");
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

      {/* 编辑弹窗 */}
      <CategoryFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        category={category}
      />

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
          确定要删除分类{" "}
          <span className="font-semibold">
            {category.code} - {category.name}
          </span>{" "}
          吗？此操作不可撤销。
        </p>
      </Modal>
    </>
  );
}
