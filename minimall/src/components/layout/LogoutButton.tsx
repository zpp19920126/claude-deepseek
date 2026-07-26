"use client";

import { useState } from "react";
import { getCsrfToken } from "@/lib/client-utils";

/**
 * 退出登录按钮（客户端组件）
 * 发送 POST 请求清除 session cookie
 */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const csrfToken = getCsrfToken();
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      window.location.href = "/";
    } catch {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
    >
      {loading ? "退出中..." : "退出"}
    </button>
  );
}
