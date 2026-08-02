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
import CustomerForm from "./CustomerForm";
import type { CustomerItem } from "@/types";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers");
      const json = await res.json();
      if (json.success) setCustomers(json.data as CustomerItem[]);
    } catch { toast.error("加载客户列表失败"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleAdd() { setEditing(null); setFormOpen(true); }
  function handleEdit(c: CustomerItem) { setEditing(c); setFormOpen(true); }
  function handleFormSuccess() { setFormOpen(false); setEditing(null); fetchData(); }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/customers/${deleteTarget.id}`, {
        method: "DELETE", headers: { "x-csrf-token": getCsrfToken() },
      });
      const json = await res.json();
      if (json.success) { toast.success("客户已删除"); setDeleteTarget(null); fetchData(); }
      else setDeleteError(json.error || "删除失败");
    } catch { setDeleteError("网络错误，请重试"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">客户管理</h2>
        <Button onClick={handleAdd}>+ 添加客户</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无客户数据</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>编码</TableHead><TableHead>名称</TableHead><TableHead>简称</TableHead>
                    <TableHead>联系人</TableHead><TableHead>电话</TableHead><TableHead>地区</TableHead>
                    <TableHead>价格模式</TableHead><TableHead className="w-32">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs">{c.code}</TableCell>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.shortName || "-"}</TableCell>
                      <TableCell>{c.contactPerson || "-"}</TableCell>
                      <TableCell>{c.phone || "-"}</TableCell>
                      <TableCell>{c.region || "-"}</TableCell>
                      <TableCell>{c.priceMode || "-"}</TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <CustomerForm open={formOpen} onOpenChange={setFormOpen}
          customer={editing} onSuccess={handleFormSuccess} />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteError(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">确定要删除客户「{deleteTarget?.name}」吗？此操作不可撤销。</p>
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
