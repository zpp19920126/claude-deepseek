"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * 客户搜索表单
 * 通过更新 URL searchParams 触发 Server Component 重新查询
 * 搜索框：客户编码、客户名称、简称
 */
export function CustomerSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");

  function handleSearch() {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("page", "1");
    router.push(`/customers?${params.toString()}`);
  }

  function handleReset() {
    setSearch("");
    router.push("/customers");
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Input
          label="搜索"
          placeholder="输入客户编码、客户名称或简称"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button onClick={handleSearch}>查询</Button>
        <Button variant="secondary" onClick={handleReset}>
          重置
        </Button>
      </div>
    </div>
  );
}
