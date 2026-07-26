import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

/**
 * 全局页头 — Server Component 读取 session cookie
 */
export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
        >
          Mini Mall
        </Link>

        {/* 导航 */}
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            首页
          </Link>

          {user ? (
            <>
              <Link href="/orders" className="text-gray-600 hover:text-gray-900">
                我的订单
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="text-gray-600 hover:text-gray-900">
                  后台管理
                </Link>
              )}
              <span className="text-gray-400">|</span>
              <span className="text-gray-500 text-xs">
                {user.name || user.email}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                登录
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
