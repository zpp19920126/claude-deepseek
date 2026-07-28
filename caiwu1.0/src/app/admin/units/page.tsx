"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import UnitFormDialog from "@/components/forms/UnitFormDialog";
import { getCsrfToken } from "@/lib/utils";

interface Unit {
  code: string;
  name: string;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/units");
      const json = await res.json();
      if (json.success) setUnits(json.data);
    } catch {
      toast.error("加载单位列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);

  function handleAdd() { setEditingUnit(null); setFormOpen(true); }
  function handleEdit(unit: Unit) { setEditingUnit(unit); setFormOpen(true); }
  function handleFormSuccess() { setFormOpen(false); setEditingUnit(null); fetchUnits(); }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/units/${deleteTarget.code}`, {
        method: "DELETE",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      const json = await res.json();
      if (json.success) {
        toast.success("单位已删除");
        setDeleteTarget(null);
        fetchUnits();
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
        <h2 className="text-2xl font-bold tracking-tight">基本单位管理</h2>
        <Button onClick={handleAdd}>+ 添加单位</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : units.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无单位数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>单位编码</TableHead>
                  <TableHead>单位名称</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u) => (
                  <TableRow key={u.code}>
                    <TableCell className="font-mono">{u.code}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(u)}>编辑</Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(u)}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <UnitFormDialog open={formOpen} onOpenChange={setFormOpen} unit={editingUnit} onSuccess={handleFormSuccess} />

      {/* 删除确认 */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            确定要删除单位「{deleteTarget?.name}」({deleteTarget?.code}) 吗？此操作不可撤销。
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
