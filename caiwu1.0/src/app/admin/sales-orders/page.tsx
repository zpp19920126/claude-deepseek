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
import { getCsrfToken } from "@/lib/utils";
import SalesOrderForm from "./SalesOrderForm";
import type { SalesOrderItem } from "@/types";

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalesOrderItem | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SalesOrderItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sales-orders");
      const json = await res.json();
      if (json.success) setOrders(json.data);
    } catch { toast.error("加载销售单列表失败"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleAdd() { setEditing(null); setFormOpen(true); }
  function handleEdit(o: SalesOrderItem) { setEditing(o); setFormOpen(true); }
  function handleFormSuccess() { setFormOpen(false); setEditing(null); fetchData(); }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/sales-orders/${deleteTarget.id}`, {
        method: "DELETE", headers: { "x-csrf-token": getCsrfToken() },
      });
      const json = await res.json();
      if (json.success) { toast.success("销售单已删除"); setDeleteTarget(null); fetchData(); }
      else setDeleteError(json.error || "删除失败");
    } catch { setDeleteError("网络错误，请重试"); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">销售单管理</h2>
        <Button onClick={handleAdd}>+ 新建销售单</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无销售单数据</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>单据编号</TableHead><TableHead>交货日期</TableHead><TableHead>客户</TableHead>
                    <TableHead>商品</TableHead><TableHead>收款金额</TableHead><TableHead>经手人</TableHead>
                    <TableHead>部门</TableHead><TableHead className="w-32">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.documentNo}</TableCell>
                      <TableCell className="text-xs">{o.deliveryDate?.split("T")[0] || "-"}</TableCell>
                      <TableCell>{o.customer?.shortName || o.customerName || "-"}</TableCell>
                      <TableCell>{o.productName || o.product?.name || "-"}</TableCell>
                      <TableCell>{o.receiptAmount != null ? `¥${o.receiptAmount.toFixed(2)}` : "-"}</TableCell>
                      <TableCell>{o.handler || "-"}</TableCell>
                      <TableCell>{o.department || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(o)}>编辑</Button>
                          <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(o)}>删除</Button>
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

      {formOpen && <SalesOrderForm open={formOpen} onOpenChange={setFormOpen} order={editing} onSuccess={handleFormSuccess} />}

      <Dialog open={!!deleteTarget} onOpenChange={() => { setDeleteTarget(null); setDeleteError(""); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>确认删除</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">确定要删除销售单「{deleteTarget?.documentNo}」吗？</p>
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
