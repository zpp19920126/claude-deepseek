"use client";

import { useState, useEffect, useCallback } from "react";
import { Table, type Column } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { ExportButton } from "@/components/features/export-button";
import { toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import type { Unit } from "@prisma/client";

interface PaginatedData {
  items: Unit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface FormState {
  code: string;
  name: string;
}

const initialForm: FormState = { code: "", name: "" };

export function UnitsManager() {
  const [data, setData] = useState<PaginatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Modal 状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/units?page=${page}&pageSize=${pageSize}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error(json.error || "获取数据失败");
      }
    } catch {
      toast.error("网络错误，获取数据失败");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setForm(initialForm);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(unit: Unit) {
    setForm({ code: unit.code, name: unit.name });
    setEditingId(unit.id);
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("编码和名称不能为空");
      return;
    }
    setSubmitting(true);
    try {
      const url = editingId ? `/api/units/${editingId}` : "/api/units";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingId ? "更新成功" : "创建成功");
        setModalOpen(false);
        fetchData();
      } else {
        toast.error(json.error || "操作失败");
      }
    } catch {
      toast.error("网络错误，操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/units/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("删除成功");
        setDeleteTarget(null);
        fetchData();
      } else {
        toast.error(json.error || "删除失败");
      }
    } catch {
      toast.error("网络错误，删除失败");
    } finally {
      setDeleting(false);
    }
  }

  const columns: Column<Unit>[] = [
    {
      key: "code",
      title: "单位编码",
      render: (row) => <span className="font-mono">{row.code}</span>,
    },
    {
      key: "name",
      title: "单位名称",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "createdAt",
      title: "添加时间",
      render: (row) => (
        <span className="text-text-muted">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      title: "操作",
      width: "120px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEdit(row)}
            className="text-primary hover:underline text-sm"
          >
            编辑
          </button>
          <span className="text-border">|</span>
          <button
            onClick={() => setDeleteTarget(row)}
            className="text-danger hover:underline text-sm"
          >
            删除
          </button>
        </div>
      ),
    },
  ];

  // 序号在表格渲染时无法直接拿到 index，所以给 data 加序号字段
  const itemsWithIndex = data
    ? data.items.map((item, i) => ({
        ...item,
        index: (data.page - 1) * data.pageSize + i + 1,
      }))
    : [];

  const columnsWithIndex: Column<(typeof itemsWithIndex)[number]>[] = [
    {
      key: "index",
      title: "序号",
      width: "64px",
      render: (row) => <span className="text-text-muted">{row.index}</span>,
    },
    ...columns.map((c) => ({
      ...c,
      render: c.render
        ? (row: (typeof itemsWithIndex)[number]) => c.render!(row)
        : undefined,
    })),
  ];

  return (
    <div>
      {/* 页头 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">基本单位管理</h1>
          <p className="text-sm text-text-muted mt-1">
            {data ? `共 ${data.total} 条记录` : "加载中..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate}>+ 新增单位</Button>
          <ExportButton apiUrl="/api/units/export" fileName="基本单位列表.xlsx" />
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <Table
          columns={columnsWithIndex}
          data={itemsWithIndex}
          rowKey={(row) => row.id}
          emptyText={loading ? "加载中..." : "暂无单位数据"}
        />
      </div>

      {/* 分页 */}
      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}

      {/* 新增/编辑 Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "编辑单位" : "新增单位"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              确定
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="单位编码"
            placeholder="如：U001"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            disabled={submitting}
          />
          <Input
            label="单位名称"
            placeholder="如：斤、公斤、个"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            disabled={submitting}
          />
        </div>
      </Modal>

      {/* 删除确认 Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="确认删除"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              确认删除
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          确定要删除单位{" "}
          <span className="font-semibold">
            {deleteTarget?.code} - {deleteTarget?.name}
          </span>{" "}
          吗？此操作不可撤销。
        </p>
      </Modal>
    </div>
  );
}
