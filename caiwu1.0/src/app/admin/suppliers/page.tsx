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
import { getCsrfToken } from "@/lib/utils";
import SupplierForm from "./SupplierForm";
import type { SupplierItem } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SupplierItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/suppliers");
      const json = await res.json();
      if (json.success) setSuppliers(json.data as SupplierItem[]);
    } catch { toast.error("加载供应商列表失败"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleAdd() { setEditing(null); setFormOpen(true); }
  function handleEdit(s: SupplierItem) { setEditing(s); setFormOpen(true); }
  function handleFormSuccess() { setFormOpen(false); setEditing(null); fetchData(); }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/suppliers/${deleteTarget.id}`, {
        method: "DELETE", headers: { "x-csrf-token": getCsrfToken() },
      });
      const json = await res.json();
      if (json.success) { toast.success("供应商已删除"); setDeleteTarget(null); fetchData(); }
      else setDeleteError(json.error || "删除失败");
    } catch { setDeleteError("网络错误，请重试"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">供应商管理</h2>
        <Button onClick={handleAdd}>+ 添加供应商</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无供应商数据</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编码</TableHead><TableHead>名称</TableHead><TableHead>简称</TableHead>
                    <TableHead>联系人</TableHead><TableHead>电话</TableHead><TableHead>地区</TableHead>
                    <TableHead>价格模式</TableHead><TableHead>接单时间</TableHead>
                    <TableHead className="w-32">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.code}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.shortName || "-"}</TableCell>
                      <TableCell>{s.contactPerson || "-"}</TableCell>
                      <TableCell>{s.phone || "-"}</TableCell>
                      <TableCell>{s.region || "-"}</TableCell>
                      <TableCell>{s.priceMode || "-"}</TableCell>
                      <TableCell className="text-xs">
                        {s.orderStartTime && s.orderStopTime ? `${s.orderStartTime} ~ ${s.orderStopTime}` : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(s)}>编辑</Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(s)}>删除</Button>
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
        <SupplierForm open={formOpen} onOpenChange={setFormOpen}
          supplier={editing} onSuccess={handleFormSuccess} />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteError(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">确定要删除供应商「{deleteTarget?.name}」吗？此操作不可撤销。</p>
          {deleteError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-2">{deleteError}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteError(""); }}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
