"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getCsrfToken } from "@/lib/client-utils";

/**
 * 模拟支付按钮（客户端组件）
 */
export function PayButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      const data = await res.json();

      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || "支付失败");
      }
    } catch {
      setError("网络异常");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-right">
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading}
        className="px-8 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
      >
        {loading ? "处理中..." : "确认支付"}
      </button>
    </div>
  );
}
