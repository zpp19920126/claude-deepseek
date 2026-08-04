"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function PurchaseSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/purchases?${params.toString()}`);
  }

  function handleReset() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.delete("page");
    router.push(`/purchases?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSearch} className="flex items-center gap-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索进货单编号、供应商、商品..."
        className="flex-1 max-w-md px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary-dark"
      >
        查询
      </button>
      {search && (
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-bg"
        >
          重置
        </button>
      )}
    </form>
  );
}
