"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import LogoutButton from "./LogoutButton";

const navItems = [
  { href: "/admin", label: "仪表盘", icon: "📊" },
  { href: "/admin/products", label: "商品管理", icon: "🥬" },
  { href: "/admin/categories", label: "商品分类", icon: "📁" },
  { href: "/admin/units", label: "基本单位", icon: "📏" },
  { href: "/admin/customers", label: "客户管理", icon: "🏢" },
  { href: "/admin/suppliers", label: "供应商管理", icon: "🚚" },
  { href: "/admin/sales-orders", label: "销售单管理", icon: "📋" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-zinc-900 text-zinc-100 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-zinc-800">
        <h1 className="text-lg font-bold tracking-wide">🥬 绿粮</h1>
        <p className="text-xs text-zinc-400 mt-1">蔬菜配送管理系统</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-zinc-800">
        <LogoutButton />
      </div>
    </aside>
  );
}
