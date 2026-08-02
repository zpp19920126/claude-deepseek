import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 确保 Prisma 在 Next.js 中正常工作
  serverExternalPackages: ["@prisma/client", "bcryptjs", "xlsx"],
};

export default nextConfig;
