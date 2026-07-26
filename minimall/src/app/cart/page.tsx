import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CartClient } from "./CartClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "购物车 - Mini Mall",
};

/**
 * 购物车页 — Server Component 校验登录
 */
export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">购物车</h1>
      <CartClient />
    </div>
  );
}
