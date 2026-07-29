"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { SalesOrderItem } from "@/types";
import SaleFormDialog from "@/components/SaleFormDialog";

interface ListData {
  items: SalesOrderItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function SaleListView({ initialData }: { initialData: ListData }) {
  const [data, setData] = useState<ListData>(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalesOrderItem | null>(null);

  const fetchData = useCallback(async (s: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      params.set("page", String(p));
      const res = await fetch(`/api/sale?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch { toast.error("加载销售单列表失败"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(search, page); }, [search, page, fetchData]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleAdd() { setEditing(null); setFormOpen(true); }
  function handleEdit(o: SalesOrderItem) { setEditing(o); setFormOpen(true); }
  function handleFormSuccess() { setFormOpen(false); setEditing(null); fetchData(search, 1); }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-3">
              <Input placeholder="搜索单据号/客户/自编号..." value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)} className="max-w-sm" />
              <Button type="submit" variant="secondary">搜索</Button>
            </form>
            <Button onClick={handleAdd}>+ 新建销售单</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : data.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无销售单数据</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>单据编号</TableHead><TableHead>交货日期</TableHead>
                    <TableHead>客户</TableHead><TableHead>商品</TableHead><TableHead>单位</TableHead><TableHead>数量</TableHead>
                    <TableHead>收款金额</TableHead><TableHead>经手人</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(o)}>
                      <TableCell className="font-mono text-xs">{o.documentNo}</TableCell>
                      <TableCell className="text-xs">{o.deliveryDate?.split("T")[0] || "-"}</TableCell>
                      <TableCell>{o.customer?.shortName || o.customerName || "-"}</TableCell>
                      <TableCell>{o.productName || "-"}</TableCell>
                      <TableCell>{o.orderUnit || "-"}</TableCell>
                      <TableCell>{o.orderQuantity ?? "-"}</TableCell>
                      <TableCell>{o.receiptAmount != null ? `¥${o.receiptAmount.toFixed(2)}` : "-"}</TableCell>
                      <TableCell>{o.handler || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        </div>
      )}

      <SaleFormDialog open={formOpen} onOpenChange={setFormOpen} order={editing} onSuccess={handleFormSuccess} />
    </div>
  );
}
