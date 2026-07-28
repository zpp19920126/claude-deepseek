"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import type { ProductItem, CategoryOption, UnitOption, SupplierOption } from "@/types";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? match[1] : "";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductItem | null;
  categories: CategoryOption[];
  units: UnitOption[];
  suppliers: SupplierOption[];
  onSuccess: () => void;
}

export default function ProductForm({
  open, onOpenChange, product, categories, units, suppliers, onSuccess,
}: Props) {
  const isEdit = product !== null;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [specification, setSpecification] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [isRawVeg, setIsRawVeg] = useState(false);
  const [isCleanVeg, setIsCleanVeg] = useState(false);
  const [yieldRate, setYieldRate] = useState("");
  const [defaultSupplierId, setDefaultSupplierId] = useState("");
  const [origin, setOrigin] = useState("");
  const [model, setModel] = useState("");
  const [sorter, setSorter] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setCode(product.code);
      setName(product.name);
      setShortName(product.shortName || "");
      setSpecification(product.specification || "");
      setUnitCode(product.unitCode || "");
      setCategoryCode(product.categoryCode || "");
      setIsRawVeg(product.isRawVeg);
      setIsCleanVeg(product.isCleanVeg);
      setYieldRate(product.yieldRate?.toString() || "");
      setDefaultSupplierId(product.defaultSupplierId || "");
      setOrigin(product.origin || "");
      setModel(product.model || "");
      setSorter(product.sorter || "");
      setShelfLife(product.shelfLife?.toString() || "");
      setRemark(product.remark || "");
    } else {
      setCode(""); setName(""); setShortName(""); setSpecification("");
      setUnitCode(""); setCategoryCode("");
      setIsRawVeg(false); setIsCleanVeg(false);
      setYieldRate(""); setDefaultSupplierId("");
      setOrigin(""); setModel(""); setSorter("");
      setShelfLife(""); setRemark("");
    }
  }, [product, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name) { toast.error("商品编码和名称为必填项"); return; }

    setLoading(true);
    try {
      const payload = {
        code, name,
        shortName: shortName || null,
        specification: specification || null,
        unitCode: unitCode || null,
        categoryCode: categoryCode || null,
        isRawVeg, isCleanVeg,
        yieldRate: yieldRate ? parseFloat(yieldRate) : null,
        defaultSupplierId: defaultSupplierId || null,
        defaultSupplierShortName: defaultSupplierId
          ? suppliers.find((s) => s.id === defaultSupplierId)?.shortName || null
          : null,
        origin: origin || null,
        model: model || null,
        sorter: sorter || null,
        shelfLife: shelfLife ? parseInt(shelfLife, 10) : null,
        remark: remark || null,
        operator: "admin",
        createdBy: isEdit ? undefined : "admin",
      };

      const url = isEdit ? `/api/admin/products/${product!.id}` : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
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
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑商品" : "添加商品"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">基本信息</TabsTrigger>
              <TabsTrigger value="attr" className="flex-1">商品属性</TabsTrigger>
              <TabsTrigger value="other" className="flex-1">其他信息</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">商品编码 <span className="text-red-500">*</span></Label>
                  <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} disabled={isEdit} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">商品名称 <span className="text-red-500">*</span></Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shortName">商品简称</Label>
                  <Input id="shortName" value={shortName} onChange={(e) => setShortName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">商品型号</Label>
                  <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="spec">商品规格</Label>
                  <Input id="spec" value={specification} onChange={(e) => setSpecification(e.target.value)} placeholder="散装/袋装/箱装" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCode">基本单位</Label>
                  <Select value={unitCode} onValueChange={(v) => setUnitCode(v ?? "")}>
                    <SelectTrigger id="unitCode"><SelectValue placeholder="选择单位" /></SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.code!} value={u.code!}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryCode">商品分类</Label>
                  <Select value={categoryCode} onValueChange={(v) => setCategoryCode(v ?? "")}>
                    <SelectTrigger id="categoryCode"><SelectValue placeholder="选择分类" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.code!} value={c.code!}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplierId">默认供应商</Label>
                  <Select value={defaultSupplierId} onValueChange={(v) => setDefaultSupplierId(v ?? "")}>
                    <SelectTrigger id="supplierId"><SelectValue placeholder="选择供应商" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id!} value={s.id!}>{s.shortName || s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="attr" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>蔬菜类型</Label>
                  <div className="flex gap-4 pt-2">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={isRawVeg} onChange={(e) => setIsRawVeg(e.target.checked)} className="rounded" />
                      毛菜
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={isCleanVeg} onChange={(e) => setIsCleanVeg(e.target.checked)} className="rounded" />
                      净菜
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yieldRate">出成率</Label>
                  <Input id="yieldRate" type="number" step="0.01" min="0" max="1"
                    value={yieldRate} onChange={(e) => setYieldRate(e.target.value)} placeholder="0.00 ~ 1.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">产地</Label>
                  <Input id="origin" value={origin} onChange={(e) => setOrigin(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shelfLife">保质期（天）</Label>
                  <Input id="shelfLife" type="number" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sorter">分拣员</Label>
                <Input id="sorter" value={sorter} onChange={(e) => setSorter(e.target.value)} />
              </div>
            </TabsContent>

            <TabsContent value="other" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="remark">备注</Label>
                <Input id="remark" value={remark} onChange={(e) => setRemark(e.target.value)} />
              </div>
              {isEdit && (
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>创建人：{product?.createdBy || "-"}</div>
                  <div>操作员：{product?.operator || "-"}</div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : isEdit ? "保存修改" : "创建商品"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
