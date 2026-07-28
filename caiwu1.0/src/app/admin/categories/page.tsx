"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import CategoryFormDialog from "@/components/forms/CategoryFormDialog";

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/categories");
      const json = await res.json();
      if (json.success) setCategories(json.data);
    } catch {
      toast.error("加载分类列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  function handleAdd() { setEditingCategory(null); setFormOpen(true); }
  function handleEdit(cat: Category) { setEditingCategory(cat); setFormOpen(true); }
  function handleFormSuccess() { setFormOpen(false); setEditingCategory(null); fetchCategories(); }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.code}`, {
        method: "DELETE",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("分类已删除");
        setDeleteTarget(null);
        fetchCategories();
      } else {
        toast.error(json.error || "删除失败");
      }
    } catch {
      toast.error("网络错误");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">商品分类管理</h2>
        <Button onClick={handleAdd}>+ 添加分类</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无分类数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>分类编码</TableHead>
                  <TableHead>分类名称</TableHead>
                  <TableHead>费用分摊方式</TableHead>
                  <TableHead>分摊数</TableHead>
                  <TableHead>分拣员</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.code}>
                    <TableCell className="font-mono">{c.code}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.costSharingMethod || "-"}</TableCell>
                    <TableCell>{c.sharingCount ?? "-"}</TableCell>
                    <TableCell>{c.sorter || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(c)}>编辑</Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(c)}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editingCategory} onSuccess={handleFormSuccess} />

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            确定要删除分类「{deleteTarget?.name}」({deleteTarget?.code}) 吗？此操作不可撤销。
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
