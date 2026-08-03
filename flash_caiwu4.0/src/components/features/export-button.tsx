"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";

interface ExportButtonProps {
  apiUrl: string;
  fileName?: string;
}

export function ExportButton({ apiUrl, fileName = "导出数据" }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) {
        throw new Error("导出失败");
      }

      // 获取文件 blob
      const blob = await res.blob();

      // 从响应头获取文件名
      const disposition = res.headers.get("Content-Disposition") || "";
      let exportName = fileName;
      const match = disposition.match(/filename\*=UTF-8''(.+)/);
      if (match) {
        exportName = decodeURIComponent(match[1]);
      }

      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("导出成功");
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface text-text border border-border hover:bg-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      )}
      {loading ? "导出中..." : "导出 Excel"}
    </button>
  );
}
