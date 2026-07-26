"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 退出登录按钮（客户端组件）
 * 发送 POST 请求清除 session cookie
 */
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
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
