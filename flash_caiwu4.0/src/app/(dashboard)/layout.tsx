import { redirect } from "next/navigation";
import { getCurrentUser, clearSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // 用户不存在（可能被删除），清理无效会话后跳转登录
  if (!user) {
    await clearSession();
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar userRole={user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header userName={user.name} userRole={user.role} />
        <main className="flex-1 p-6 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
