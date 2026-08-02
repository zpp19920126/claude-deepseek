"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface LogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string | null;
  operator: string;
  createdAt: string;
}

interface ListData {
  items: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ENTITIES = ["Product", "Customer", "Supplier", "Unit", "Category", "SalesOrder"];
const ACTIONS = ["CREATE", "UPDATE", "DELETE"];

const entityLabels: Record<string, string> = {
  Product: "商品", Customer: "客户", Supplier: "供应商", Unit: "基本单位", Category: "分类", SalesOrder: "销售单",
};
const actionLabels: Record<string, string> = {
  CREATE: "创建", UPDATE: "更新", DELETE: "删除",
};
const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREATE: "default", UPDATE: "secondary", DELETE: "destructive",
};

export default function AuditPage() {
  const [data, setData] = useState<ListData | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (s: string, e: string, a: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      if (e && e !== "all") params.set("entity", e);
      if (a && a !== "all") params.set("action", a);
      params.set("page", String(p));
      const res = await fetch(`/api/admin/audit?${params}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch { toast.error("加载日志失败"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(search, entity, action, page); }, [search, entity, action, page, fetchData]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">操作日志</h2>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <form onSubmit={handleSearchSubmit} className="flex gap-3">
              <Input placeholder="搜索操作人/实体/详情..." value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)} className="w-56" />
              <Button type="submit" variant="secondary">搜索</Button>
            </form>
            <Select value={entity} onValueChange={(v) => { setEntity(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-28"><SelectValue placeholder="全部实体" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部实体</SelectItem>
                {ENTITIES.map((e) => <SelectItem key={e} value={e}>{entityLabels[e]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={action} onValueChange={(v) => { setAction(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-28"><SelectValue placeholder="全部操作" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部操作</SelectItem>
                {ACTIONS.map((a) => <SelectItem key={a} value={a}>{actionLabels[a]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无操作日志</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36">时间</TableHead>
                  <TableHead className="w-20">操作</TableHead>
                  <TableHead className="w-20">实体</TableHead>
                  <TableHead className="w-40">实体 ID</TableHead>
                  <TableHead>详情</TableHead>
                  <TableHead className="w-28">操作人</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionColors[log.action] || "outline"} className="text-xs">
                        {actionLabels[log.action] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{entityLabels[log.entity] || log.entity}</TableCell>
                    <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-64 truncate">{log.detail || "-"}</TableCell>
                    <TableCell className="text-xs">{log.operator}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">共 {data.total} 条，第 {data.page}/{data.totalPages} 页</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        </div>
      )}
    </div>
  );
}
