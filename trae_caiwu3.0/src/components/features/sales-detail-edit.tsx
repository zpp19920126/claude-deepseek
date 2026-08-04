"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

interface SalesDetailEditProps {
  salesId: number;
  initialRemark: string | null;
}

/**
 * 销售单详情页备注编辑组件
 * 仅备注可编辑，其他字段关联配送单不可变
 */
export function SalesDetailEdit({ salesId, initialRemark }: SalesDetailEditProps) {
  const router = useRouter();
  const [remark, setRemark] = useState(initialRemark || "");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function startEdit() {
    setEditing(true);
  }

  function cancelEdit() {
    setRemark(initialRemark || "");
    setEditing(false);
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales/${salesId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("备注更新成功");
        setEditing(false);
        router.refresh();
      } else {
        toast.error(json.error || "更新失败");
      }
    } catch {
      toast.error("网络错误，更新失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm text-text whitespace-pre-wrap">
            {initialRemark || <span className="text-text-muted">暂无备注</span>}
          </p>
        </div>
        <Button size="sm" variant="secondary" onClick={startEdit}>
          编辑备注
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder="请输入备注（可选）"
        disabled={submitting}
      />
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleSave} loading={submitting}>
          保存
        </Button>
        <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={submitting}>
          取消
        </Button>
      </div>
    </div>
  );
}
