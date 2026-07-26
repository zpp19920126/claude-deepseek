import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "登录 - Mini Mall",
};

/**
 * 登录页 — Server Component 渲染客户端表单
 */
export default function LoginPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
          登录 Mini Mall
        </h1>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          还没有账号？{" "}
          <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            立即注册
          </a>
        </p>
      </div>
    </div>
  );
}
