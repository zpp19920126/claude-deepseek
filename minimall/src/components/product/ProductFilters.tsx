"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

type ProductFiltersProps = {
  categories: { id: string; name: string; slug: string; productCount: number }[];
};

/**
 * 商品筛选组件（客户端）
 * 搜索框 + 分类标签切换
 */
export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category") || "";
  const currentSearch = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState(currentSearch);

  // 处理搜索提交
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // 从现有 URL 参数构建，保留其他可能的参数
      const params = new URLSearchParams(searchParams.toString());
      if (searchInput.trim()) {
        params.set("search", searchInput.trim());
      } else {
        params.delete("search");
      }
      params.delete("page"); // 切换筛选条件时重置页码
      router.push(`/?${params.toString()}`);
    },
    [searchInput, searchParams, router]
  );

  // 处理分类切换
  const handleCategoryChange = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (slug) {
        params.set("category", slug);
      } else {
        params.delete("category");
      }
      if (currentSearch) params.set("search", currentSearch);
      params.delete("page"); // 切换筛选条件时重置页码
      router.push(`/?${params.toString()}`);
    },
    [searchParams, currentSearch, router]
  );

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜索商品..."
          className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </form>

      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleCategoryChange("")}
          className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
            !currentCategory
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          全部
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.slug)}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              currentCategory === cat.slug
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat.name}
            <span className="ml-1 opacity-70">({cat.productCount})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
