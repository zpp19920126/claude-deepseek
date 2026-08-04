"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { PurchaseFormDialog } from "@/components/features/purchase-form-dialog";

interface ImportResult {
  imported: number;
  errors: { row: number; error: string }[];
}

export function PurchaseToolbar() {
  const [createOpen, setCreateOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    try {
      const url = `/api/purchases/export${window.location.search}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : "进货单列表.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objUrl);
      toast.success("导出成功");
    } catch {
      toast.error("导出失败");
    }
  }

  function handlePrint() {
    window.open(`/purchases/print${window.location.search}`, "_blank");
  }

  async function handleDownloadTemplate() {
    try {
      const res = await fetch("/api/purchases/template");
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = "进货单导入模板.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objUrl);
    } catch {
      toast.error("下载模板失败");
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/purchases/import", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        toast.error(`导入失败（HTTP ${res.status}）`);
        return;
      }
      const contentType = res.headers.get("Content-Type") || "";
      if (!contentType.includes("application/json")) {
        toast.error("服务器返回了非预期的响应");
        return;
      }
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || `导入完成：新增 ${json.data.imported} 个进货单`);
        setImportResult(json.data);
      } else {
        toast.error(json.message || "导入失败");
        setImportResult(json.data);
      }
    } catch {
      toast.error("网络错误，导入失败");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          新增进货单
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleImportFile}
          className="hidden"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          loading={importing}
        >
          批量导入
        </Button>
        <Button size="sm" variant="secondary" onClick={handleExport}>
          批量导出
        </Button>
        <Button size="sm" variant="secondary" onClick={handlePrint}>
          打印
        </Button>
      </div>

      <PurchaseFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      {/* 导入结果弹窗 */}
      <Modal
        open={!!importResult}
        onClose={() => setImportResult(null)}
        title="导入结果"
        size="md"
        footer={
          <>
            {importResult && importResult.errors.length > 0 && (
              <Button
                variant="secondary"
                onClick={handleDownloadTemplate}
              >
                下载模板
              </Button>
            )}
            <Button onClick={() => setImportResult(null)}>关闭</Button>
          </>
        }
      >
        {importResult && (
          <div className="space-y-3">
            <p className="text-sm">
              成功导入：<span className="font-semibold text-green-600">{importResult.imported}</span> 条
              {importResult.errors.length > 0 && (
                <>
                  ，失败：<span className="font-semibold text-red-600">{importResult.errors.length}</span> 条
                </>
              )}
            </p>
            {importResult.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-text mb-2">
                  错误详情（前 {importResult.errors.length} 条）：
                </p>
                <div className="max-h-64 overflow-y-auto bg-bg rounded p-3">
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-danger">
                      第 {err.row} 行：{err.error}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
