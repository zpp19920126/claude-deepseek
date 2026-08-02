"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getCsrfToken } from "@/lib/utils";

interface Unit {
  code: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit | null;
  onSuccess: () => void;
}

export default function UnitFormDialog({ open, onOpenChange, unit, onSuccess }: Props) {
  const isEdit = unit !== null;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (unit) {
      setCode(unit.code);
      setName(unit.name);
    } else {
      setCode("");
      setName("");
    }
  }, [unit, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name) {
      toast.error("单位编码和名称不能为空");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/admin/units/${unit!.code}` : "/api/admin/units";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify(isEdit ? { code, name } : { code, name }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "单位更新成功" : "单位创建成功");
        onSuccess();
      } else {
        toast.error(json.error || "操作失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑单位" : "添加单位"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="ucode">单位编码 <span className="text-red-500">*</span></Label>
            <Input id="ucode" value={code} onChange={(e) => setCode(e.target.value)} disabled={isEdit} placeholder="如 jin" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="uname">单位名称 <span className="text-red-500">*</span></Label>
            <Input id="uname" value={name} onChange={(e) => setName(e.target.value)} placeholder="如 斤" required />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? "保存中..." : "保存"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
