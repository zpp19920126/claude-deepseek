import { redirect } from "next/navigation";
import { getCurrentUser, clearSession } from "@/lib/session";

/**
 * 打印路由组的统一守卫：
 * 与 dashboard 一致地做 DB 级鉴权（getCurrentUser 会查库验活），
 * 防止被删除用户在 token 有效期内访问打印页拉取全量数据。
 * 打印页不渲染 sidebar/header，保持干净的打印布局。
 */
export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    await clearSession();
    redirect("/login");
  }

  return <>{children}</>;
}
