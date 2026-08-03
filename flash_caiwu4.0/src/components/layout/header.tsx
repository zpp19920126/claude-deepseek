"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface HeaderProps {
  userName: string;
  userRole: string;
}

export function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside() {
      setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpen]);

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
      {/* 左侧：移动端菜单按钮 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-sidebar"))}
          className="lg:hidden p-2 rounded-lg hover:bg-bg text-text"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-sm font-medium text-text-muted hidden sm:block">
          欢迎回来，{userName}
        </h2>
      </div>

      {/* 右侧：用户菜单 */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg transition"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
            {userName.charAt(0)}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-text">{userName}</p>
            <p className="text-xs text-text-muted">
              {userRole === "admin" ? "管理员" : "操作员"}
            </p>
          </div>
          <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* 下拉菜单 */}
        {menuOpen && (
          <div
            className="absolute right-0 mt-2 w-48 bg-surface rounded-lg shadow-lg border border-border py-1 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm font-medium text-text">{userName}</p>
              <p className="text-xs text-text-muted">
                {userRole === "admin" ? "管理员" : "操作员"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger-light transition"
            >
              退出登录
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
