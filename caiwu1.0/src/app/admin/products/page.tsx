"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import ProductForm from "@/components/forms/ProductForm";
import type { ProductItem, CategoryOption, UnitOption, SupplierOption } from "@/types";
import { getCsrfToken } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, unitRes, supRes] = await Promise.all([
        fetch("/api/admin/products"),
        fetch("/api/admin/categories"),
        fetch("/api/admin/units"),
        fetch("/api/admin/suppliers"),
      ]);
      const [prodJson, catJson, unitJson, supJson] = await Promise.all([
        prodRes.json(), catRes.json(), unitRes.json(), supRes.json(),
      ]);
      if (prodJson.success) setProducts(prodJson.data as ProductItem[]);
      if (catJson.success) setCategories(catJson.data as CategoryOption[]);
      if (unitJson.success) setUnits(unitJson.data as UnitOption[]);
      if (supJson.success) setSuppliers(supJson.data as SupplierOption[]);
    } catch {
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleAdd() { setEditingProduct(null); setFormOpen(true); }
  function handleEdit(p: ProductItem) { setEditingProduct(p); setFormOpen(true); }
  function handleFormSuccess() { setFormOpen(false); setEditingProduct(null); fetchData(); }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("商品已删除");
        setDeleteTarget(null);
        fetchData();
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
        <h2 className="text-2xl font-bold tracking-tight">商品管理</h2>
        <Button onClick={handleAdd}>+ 添加商品</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无商品数据</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编码</TableHead>
                    <TableHead>名称</TableHead>
                    <TableHead>简称</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead>规格</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>产地</TableHead>
                    <TableHead>供应商</TableHead>
                    <TableHead>分拣员</TableHead>
                    <TableHead className="w-32">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.shortName || "-"}</TableCell>
                      <TableCell>{p.category?.name || "-"}</TableCell>
                      <TableCell>{p.unit?.name || "-"}</TableCell>
                      <TableCell>{p.specification || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {p.isRawVeg && <Badge variant="outline" className="text-xs">毛菜</Badge>}
                          {p.isCleanVeg && <Badge variant="outline" className="text-xs">净菜</Badge>}
                          {!p.isRawVeg && !p.isCleanVeg && "-"}
                        </div>
                      </TableCell>
                      <TableCell>{p.origin || "-"}</TableCell>
                      <TableCell className="text-xs">{p.defaultSupplier?.shortName || p.defaultSupplier?.name || "-"}</TableCell>
                      <TableCell>{p.sorter || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(p)}>编辑</Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(p)}>删除</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <ProductForm
          open={formOpen}
          onOpenChange={setFormOpen}
          product={editingProduct}
          categories={categories}
          units={units}
          suppliers={suppliers}
          onSuccess={handleFormSuccess}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            确定要删除商品「{deleteTarget?.name}」({deleteTarget?.code}) 吗？此操作不可撤销。
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
