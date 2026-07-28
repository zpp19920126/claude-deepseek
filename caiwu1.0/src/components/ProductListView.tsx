"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import ProductFormDialog from "@/components/ProductFormDialog";

interface Category {
  code: string;
  name: string;
}

interface Unit {
  code: string;
  name: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  shortName: string | null;
  specification: string | null;
  origin: string | null;
  model: string | null;
  unitCode: string | null;
  categoryCode: string | null;
  isRawVeg: boolean;
  isCleanVeg: boolean;
  unit: { code: string; name: string } | null;
  category: { code: string; name: string } | null;
  updatedAt: string;
}

interface ListData {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function ProductListView({
  categories,
  units,
  initialData,
}: {
  categories: Category[];
  units: Unit[];
  initialData: ListData;
}) {
  const [data, setData] = useState<ListData>(initialData);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category && category !== "all") params.set("category", category);
      params.set("page", String(page));

      const res = await fetch(`/api/goods?${params}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      toast.error("加载商品列表失败");
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchData();
  }

  function handleAdd() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function handleFormSuccess() {
    setFormOpen(false);
    setEditingProduct(null);
    fetchData();
  }

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-3">
              <Input
                placeholder="搜索商品名称或编码..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
              />
              <Button type="submit" variant="secondary">
                搜索
              </Button>
            </form>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v ?? "");
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAdd}>+ 添加商品</Button>
          </div>
        </CardContent>
      </Card>

      {/* 商品列表 */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : data.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无商品数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品编码</TableHead>
                  <TableHead>商品名称</TableHead>
                  <TableHead>简称</TableHead>
                  <TableHead>分类</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead>规格</TableHead>
                  <TableHead>产地</TableHead>
                  <TableHead>类型</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEdit(p)}
                  >
                    <TableCell className="font-mono text-sm">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.shortName || "-"}
                    </TableCell>
                    <TableCell>{p.category?.name || "-"}</TableCell>
                    <TableCell>{p.unit?.name || "-"}</TableCell>
                    <TableCell>{p.specification || "-"}</TableCell>
                    <TableCell>{p.origin || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {p.isRawVeg && (
                          <Badge variant="outline" className="text-xs">
                            毛菜
                          </Badge>
                        )}
                        {p.isCleanVeg && (
                          <Badge variant="outline" className="text-xs">
                            净菜
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            共 {data.total} 条，第 {data.page}/{data.totalPages} 页
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* 添加/编辑弹窗 */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        categories={categories}
        units={units}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
