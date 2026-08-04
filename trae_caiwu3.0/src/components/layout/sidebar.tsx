"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** 是否已实现（未实现的菜单项标记为"敬请期待"，避免 404） */
  enabled?: boolean;
  /** 允许访问的角色，未指定则所有角色可见 */
  roles?: ("admin" | "user")[];
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "概览",
    items: [
      { label: "仪表盘", href: "/", icon: "📊", enabled: true },
    ],
  },
  {
    title: "商品管理",
    items: [
      { label: "商品列表", href: "/products", icon: "🥬", enabled: true },
      { label: "商品分类", href: "/categories", icon: "📁", enabled: true },
      { label: "基本单位", href: "/units", icon: "📏", enabled: true },
    ],
  },
  {
    title: "客户与供应商",
    items: [
      { label: "客户管理", href: "/customers", icon: "👤", enabled: true },
      { label: "供应商管理", href: "/suppliers", icon: "🚚", enabled: true },
    ],
  },
  {
    title: "订单管理",
    items: [
      { label: "配送单", href: "/delivery-orders", icon: "🚚", enabled: true },
      { label: "销售单", href: "/sales", icon: "📋", enabled: true },
      { label: "进货管理", href: "/purchases", icon: "📦", enabled: true },
    ],
  },
  {
    title: "系统",
    items: [
      { label: "操作日志", href: "/logs", icon: "📝", roles: ["admin"] },
    ],
  },
];

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // 监听移动端菜单切换事件
  useEffect(() => {
    function handleToggle() {
      setMobileOpen((prev) => !prev);
    }
    window.addEventListener("toggle-sidebar", handleToggle);
    return () => window.removeEventListener("toggle-sidebar", handleToggle);
  }, []);

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // 按角色过滤菜单组
  const filteredGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (userRole && item.roles.includes(userRole as "admin" | "user"))
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-surface border-r border-border flex flex-col transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-border shrink-0">
          <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm">
            Lv
          </div>
          <span className="font-bold text-text text-lg">lvliang</span>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = isActive(item.href);

                  // 未实现的菜单项，显示为禁用状态
                  if (item.enabled === false) {
                    return (
                      <div
                        key={item.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-text-muted/50 cursor-not-allowed"
                        title="敬请期待"
                      >
                        <span className="text-base opacity-50">{item.icon}</span>
                        {item.label}
                        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-bg text-text-muted">
                          待开发
                        </span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        active
                          ? "bg-primary-lighter text-primary-dark"
                          : "text-text-muted hover:bg-bg hover:text-text"
                      )}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* 底部版本信息 */}
        <div className="px-6 py-3 border-t border-border shrink-0">
          <p className="text-xs text-text-muted">v0.1.0</p>
        </div>
      </aside>
    </>
  );
}

// 移动端菜单切换按钮
export function SidebarToggle() {
  return (
    <button
      onClick={() => {
        const event = new CustomEvent("toggle-sidebar");
        window.dispatchEvent(event);
      }}
      className="lg:hidden p-2 rounded-lg hover:bg-bg text-text"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
