"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null; // null = 添加模式
  categories: Category[];
  units: Unit[];
  onSuccess: () => void;
}

export default function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  units,
  onSuccess,
}: Props) {
  const isEdit = product !== null;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [origin, setOrigin] = useState("");
  const [specification, setSpecification] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setCode(product.code);
      setName(product.name);
      setShortName(product.shortName || "");
      setCategoryCode(product.categoryCode || "");
      setUnitCode(product.unitCode || "");
      setOrigin(product.origin || "");
      setSpecification(product.specification || "");
      setModel(product.model || "");
    } else {
      setCode("");
      setName("");
      setShortName("");
      setCategoryCode("");
      setUnitCode("");
      setOrigin("");
      setSpecification("");
      setModel("");
    }
  }, [product, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!code || !name) {
      toast.error("商品编码和商品名称为必填项");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        code,
        name,
        shortName: shortName || null,
        categoryCode: categoryCode || null,
        unitCode: unitCode || null,
        origin: origin || null,
        specification: specification || null,
        model: model || null,
      };

      const url = isEdit ? `/api/goods/${product!.id}` : "/api/goods";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "商品更新成功" : "商品创建成功");
        onSuccess();
      } else {
        toast.error(json.error || "操作失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑商品" : "添加商品"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* 商品编码（必填，编辑时不可改） */}
          <div className="space-y-2">
            <Label htmlFor="code">
              商品编码 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEdit}
              placeholder="如 VG011"
              required
            />
          </div>

          {/* 商品名称（必填） */}
          <div className="space-y-2">
            <Label htmlFor="name">
              商品名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如 大白菜"
              required
            />
          </div>

          {/* 商品简称（选填） */}
          <div className="space-y-2">
            <Label htmlFor="shortName">商品简称</Label>
            <Input
              id="shortName"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="如 白菜"
            />
          </div>

          {/* 商品分类 + 基本单位 并排 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryCode">
                商品分类 <span className="text-red-500">*</span>
              </Label>
              <Select value={categoryCode} onValueChange={(v) => setCategoryCode(v ?? "")}>
                <SelectTrigger id="categoryCode">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitCode">
                基本单位 <span className="text-red-500">*</span>
              </Label>
              <Select value={unitCode} onValueChange={(v) => setUnitCode(v ?? "")}>
                <SelectTrigger id="unitCode">
                  <SelectValue placeholder="选择单位" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u.code} value={u.code}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 产地 + 规格 并排 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">产地</Label>
              <Input
                id="origin"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="如 山东寿光"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specification">商品规格</Label>
              <Input
                id="specification"
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
                placeholder="如 散装 / 袋装"
              />
            </div>
          </div>

          {/* 商品型号（选填） */}
          <div className="space-y-2">
            <Label htmlFor="model">商品型号</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="如 XL"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : isEdit ? "保存修改" : "创建商品"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
