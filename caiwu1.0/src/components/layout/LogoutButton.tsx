"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getCsrfToken } from "@/lib/utils";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      // 清除 CSRF cookie
      document.cookie = "csrf-token=; path=/; max-age=0";
      toast.success("已退出登录");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("退出失败");
    }
  }

  return (
    <Button
      variant="ghost"
      className="w-full text-zinc-400 hover:text-white hover:bg-zinc-800 justify-start"
      onClick={handleLogout}
    >
      退出登录
    </Button>
  );
}
