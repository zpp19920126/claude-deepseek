"use client";

import { useEffect } from "react";

/**
 * 自动触发浏览器打印对话框，并提供手动打印按钮
 */
export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print" style={{ marginBottom: 16, padding: "20px 20px 0" }}>
      <button
        onClick={() => window.print()}
        style={{
          padding: "8px 16px",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        打印 / 保存为 PDF
      </button>
      <span style={{ marginLeft: 12, fontSize: 12, color: "#999" }}>
        提示：在打印对话框中选择&quot;另存为 PDF&quot;可保存到本地
      </span>
    </div>
  );
}
