"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { CustomerFormDialog } from "@/components/features/customer-form-dialog";

/**
 * 客户工具栏：新增客户 + 批量导入 + 批量导出 + 打印
 */
export function CustomerToolbar() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [importResult, setImportResult] = useState<{
    open: boolean;
    message: string;
    errors: { row: number; error: string }[];
  }>({ open: false, message: "", errors: [] });

  async function handleExport() {
    try {
      const res = await fetch("/api/customers/export");
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") || "";
      let fileName = "客户列表.xlsx";
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      if (match) fileName = decodeURIComponent(match[1]);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("导出成功");
    } catch {
      toast.error("导出失败，请稍后重试");
    }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await fetch("/api/customers/template");
      if (!res.ok) throw new Error("下载失败");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "客户导入模板.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
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
      const res = await fetch("/api/customers/import", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setImportResult({
          open: true,
          message: json.message,
          errors: json.data?.errors || [],
        });
        router.refresh();
      } else {
        // 有错误详情时也展示弹窗
        if (json.data?.errors?.length > 0) {
          setImportResult({
            open: true,
            message: json.message || "导入失败",
            errors: json.data.errors,
          });
        } else {
          toast.error(json.error || "导入失败");
        }
      }
    } catch {
      toast.error("网络错误，导入失败");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function handlePrint() {
    // 打开打印页（带当前搜索条件）
    const params = new URLSearchParams(window.location.search);
    window.open(`/customers/print?${params.toString()}`, "_blank");
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportFile}
      />
      <Button onClick={() => setCreateOpen(true)}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        新增客户
      </Button>
      <Button
        variant="secondary"
        onClick={() => fileRef.current?.click()}
        loading={importing}
      >
        {!importing && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        )}
        批量导入
      </Button>
      <Button variant="secondary" onClick={handleExport}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        批量导出
      </Button>
      <Button variant="secondary" onClick={handlePrint}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        打印
      </Button>

      {/* 导入结果弹窗 */}
      <Modal
        open={importResult.open}
        onClose={() => setImportResult({ ...importResult, open: false })}
        title="导入结果"
        footer={
          <>
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              下载模板
            </Button>
            <Button onClick={() => setImportResult({ ...importResult, open: false })}>
              确定
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text">{importResult.message}</p>
          {importResult.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-danger mb-1">
                错误详情（前 {importResult.errors.length} 条）：
              </p>
              <div className="max-h-48 overflow-y-auto scrollbar-thin border border-border rounded-lg">
                <ul className="divide-y divide-border">
                  {importResult.errors.map((err, i) => (
                    <li
                      key={i}
                      className="px-3 py-2 text-xs text-text-muted"
                    >
                      第 {err.row} 行：{err.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 新增客户弹窗 */}
      <CustomerFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
