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

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? match[1] : "";
}

interface Category {
  code: string;
  name: string;
  icon: string | null;
  costSharingMethod: string | null;
  sharingCount: number | null;
  sorter: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSuccess: () => void;
}

export default function CategoryFormDialog({ open, onOpenChange, category, onSuccess }: Props) {
  const isEdit = category !== null;
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [costSharingMethod, setCostSharingMethod] = useState("");
  const [sharingCount, setSharingCount] = useState("");
  const [sorter, setSorter] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setCode(category.code);
      setName(category.name);
      setCostSharingMethod(category.costSharingMethod || "");
      setSharingCount(category.sharingCount?.toString() || "");
      setSorter(category.sorter || "");
    } else {
      setCode("");
      setName("");
      setCostSharingMethod("");
      setSharingCount("");
      setSorter("");
    }
  }, [category, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name) {
      toast.error("分类编码和名称不能为空");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/admin/categories/${category!.code}` : "/api/admin/categories";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        ...(isEdit ? { newCode: code !== category!.code ? code : undefined } : { code }),
        name,
        costSharingMethod: costSharingMethod || null,
        sharingCount: sharingCount ? parseInt(sharingCount, 10) : null,
        sorter: sorter || null,
      };
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "分类更新成功" : "分类创建成功");
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑分类" : "添加分类"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ccode">分类编码 <span className="text-red-500">*</span></Label>
              <Input id="ccode" value={code} onChange={(e) => setCode(e.target.value)} disabled={isEdit} placeholder="如 LS06" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cname">分类名称 <span className="text-red-500">*</span></Label>
              <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="如 干货类" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cmethod">费用分摊方式</Label>
            <Input id="cmethod" value={costSharingMethod} onChange={(e) => setCostSharingMethod(e.target.value)} placeholder="按重量 / 按件数" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cshare">分摊数</Label>
              <Input id="cshare" type="number" value={sharingCount} onChange={(e) => setSharingCount(e.target.value)} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="csorter">分拣员</Label>
              <Input id="csorter" value={sorter} onChange={(e) => setSorter(e.target.value)} placeholder="如 张三" />
            </div>
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
