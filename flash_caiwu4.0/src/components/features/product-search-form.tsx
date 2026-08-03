"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EntityPicker } from "@/components/features/entity-picker";

/**
 * 商品搜索表单
 * 通过更新 URL searchParams 触发 Server Component 重新查询
 */
export function ProductSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sku, setSku] = useState(searchParams.get("sku") || "");
  const [name, setName] = useState(searchParams.get("name") || "");
  const [shortName, setShortName] = useState(
    searchParams.get("shortName") || ""
  );
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") || ""
  );
  const [categoryName, setCategoryName] = useState(
    searchParams.get("categoryName") || ""
  );
  const [supplierId, setSupplierId] = useState(
    searchParams.get("supplierId") || ""
  );
  const [supplierName, setSupplierName] = useState(
    searchParams.get("supplierName") || ""
  );

  // 弹窗状态
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);

  function handleSearch() {
    const params = new URLSearchParams();
    if (sku.trim()) params.set("sku", sku.trim());
    if (name.trim()) params.set("name", name.trim());
    if (shortName.trim()) params.set("shortName", shortName.trim());
    if (categoryId) {
      params.set("categoryId", categoryId);
      params.set("categoryName", categoryName);
    }
    if (supplierId) {
      params.set("supplierId", supplierId);
      params.set("supplierName", supplierName);
    }
    params.set("page", "1");
    router.push(`/products?${params.toString()}`);
  }

  function handleReset() {
    setSku("");
    setName("");
    setShortName("");
    setCategoryId("");
    setCategoryName("");
    setSupplierId("");
    setSupplierName("");
    router.push("/products");
  }

  return (
    <div className="bg-surface rounded-xl border border-border p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Input
          label="商品编码"
          placeholder="输入商品编码"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <Input
          label="商品名称"
          placeholder="输入商品名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <Input
          label="商品简称"
          placeholder="输入商品简称"
          value={shortName}
          onChange={(e) => setShortName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />

        {/* 商品分类选择器 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            商品分类
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              readOnly
              placeholder="点击右侧按钮选择"
              value={categoryName}
              onClick={() => setCategoryPickerOpen(true)}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg text-sm text-text cursor-pointer placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCategoryPickerOpen(true)}
            >
              搜索
            </Button>
            {categoryId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCategoryId("");
                  setCategoryName("");
                }}
              >
                清除
              </Button>
            )}
          </div>
        </div>

        {/* 默认供应商选择器 */}
        <div>
          <label className="block text-sm font-medium text-text mb-1">
            默认供应商
          </label>
          <div className="flex gap-1">
            <input
              type="text"
              readOnly
              placeholder="点击右侧按钮选择"
              value={supplierName}
              onClick={() => setSupplierPickerOpen(true)}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-bg text-sm text-text cursor-pointer placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setSupplierPickerOpen(true)}
            >
              搜索
            </Button>
            {supplierId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSupplierId("");
                  setSupplierName("");
                }}
              >
                清除
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button onClick={handleSearch}>查询</Button>
        <Button variant="secondary" onClick={handleReset}>
          重置
        </Button>
      </div>

      {/* 分类选择弹窗 */}
      <EntityPicker
        open={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        onSelect={(item) => {
          setCategoryId(String(item.id));
          setCategoryName(item.name);
        }}
        title="选择商品分类"
        apiUrl="/api/categories"
      />

      {/* 供应商选择弹窗 */}
      <EntityPicker
        open={supplierPickerOpen}
        onClose={() => setSupplierPickerOpen(false)}
        onSelect={(item) => {
          setSupplierId(String(item.id));
          setSupplierName(item.name);
        }}
        title="选择供应商"
        apiUrl="/api/suppliers"
      />
    </div>
  );
}
