import type { Metadata } from "next";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = {
  title: "注册 - Mini Mall",
};

/**
 * 注册页 — Server Component 渲染客户端表单
 */
export default function RegisterPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
          注册 Mini Mall
        </h1>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          已有账号？{" "}
          <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            立即登录
          </a>
        </p>
      </div>
    </div>
  );
}
