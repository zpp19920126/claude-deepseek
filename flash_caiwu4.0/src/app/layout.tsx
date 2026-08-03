import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "lvliang - 蔬菜配送管理系统",
  description: "lvliang 蔬菜配送管理系统 - 商品、客户、销售、进货一体化管理",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
