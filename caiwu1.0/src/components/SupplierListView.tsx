"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { SupplierItem } from "@/types";
import SupplierFormDialog from "@/components/SupplierFormDialog";

interface ListData {
  items: SupplierItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function SupplierListView({ initialData }: { initialData: ListData }) {
  const [data, setData] = useState<ListData>(initialData);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierItem | null>(null);

  const fetchData = useCallback(async (s: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      params.set("page", String(p));
      const res = await fetch(`/api/supplier?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      toast.error("加载供应商列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(search, page); }, [search, page, fetchData]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function handleAdd() { setEditing(null); setFormOpen(true); }
  function handleEdit(s: SupplierItem) { setEditing(s); setFormOpen(true); }
  function handleFormSuccess() { setFormOpen(false); setEditing(null); fetchData(search, 1); }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-3">
              <Input placeholder="搜索供应商名称/编码/联系人..." value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)} className="max-w-sm" />
              <Button type="submit" variant="secondary">搜索</Button>
            </form>
            <Button onClick={handleAdd}>+ 添加供应商</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : data.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无供应商数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>单位编码</TableHead>
                  <TableHead>单位名称</TableHead>
                  <TableHead>简称</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>电话</TableHead>
                  <TableHead>手机</TableHead>
                  <TableHead>接单时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(s)}>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.shortName || "-"}</TableCell>
                    <TableCell>{s.contactPerson || "-"}</TableCell>
                    <TableCell>{s.phone || "-"}</TableCell>
                    <TableCell>{s.mobile || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {s.orderStartTime && s.orderStopTime ? `${s.orderStartTime} ~ ${s.orderStopTime}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

      <SupplierFormDialog open={formOpen} onOpenChange={setFormOpen} supplier={editing} onSuccess={handleFormSuccess} />
    </div>
  );
}
