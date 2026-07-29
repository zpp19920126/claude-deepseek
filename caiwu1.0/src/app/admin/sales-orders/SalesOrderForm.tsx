"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { getCsrfToken, safeParseFloat, safeParseInt } from "@/lib/utils";
import type { SalesOrderItem, CustomerItem } from "@/types";

interface ProductOption { code: string; name: string; unit: { name: string } | null; }

interface Props {
  open: boolean; onOpenChange: (open: boolean) => void;
  order: SalesOrderItem | null; onSuccess: () => void;
}

export default function SalesOrderForm({ open, onOpenChange, order, onSuccess }: Props) {
  const isEdit = order !== null;
  const [loading, setLoading] = useState(false);

  const [documentNo, setDocumentNo] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [selfNo, setSelfNo] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerShortName, setCustomerShortName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [orderUnit, setOrderUnit] = useState("");
  const [orderQuantity, setOrderQuantity] = useState("");
  const [receiptAccount, setReceiptAccount] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [amount, setAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [handler, setHandler] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [content, setContent] = useState("");
  const [department, setDepartment] = useState("");
  const [sorter, setSorter] = useState("");
  const [remark, setRemark] = useState("");

  // 客户选择器
  const [custPickerOpen, setCustPickerOpen] = useState(false);
  const [custSearch, setCustSearch] = useState("");
  const [custList, setCustList] = useState<CustomerItem[]>([]);
  const searchCust = useCallback(async (q: string) => {
    try {
      const p = new URLSearchParams(); if (q) p.set("search", q); p.set("page", "1");
      const r = await fetch(`/api/custom?${p}`); const j = await r.json();
      if (j.success) setCustList(j.data.items);
    } catch { toast.error("加载客户失败"); }
  }, []);
  useEffect(() => { if (custPickerOpen) searchCust(""); }, [custPickerOpen, searchCust]);

  // 商品选择器
  const [prodPickerOpen, setProdPickerOpen] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [prodList, setProdList] = useState<ProductOption[]>([]);
  const searchProd = useCallback(async (q: string) => {
    try {
      const p = new URLSearchParams(); if (q) p.set("search", q); p.set("page", "1");
      const r = await fetch(`/api/goods?${p}`); const j = await r.json();
      if (j.success) setProdList(j.data.items);
    } catch { toast.error("加载商品失败"); }
  }, []);
  useEffect(() => { if (prodPickerOpen) searchProd(""); }, [prodPickerOpen, searchProd]);

  function selectCustomer(c: CustomerItem) {
    setCustomerCode(c.code); setCustomerName(c.name); setCustomerShortName(c.shortName || ""); setCustPickerOpen(false);
  }
  function selectProduct(p: ProductOption) {
    setProductCode(p.code); setProductName(p.name); setOrderUnit(p.unit?.name || ""); setProdPickerOpen(false);
  }

  useEffect(() => {
    if (order) {
      setDocumentNo(order.documentNo); setDeliveryDate(order.deliveryDate?.split("T")[0] || "");
      setSelfNo(order.selfNo || ""); setCustomerCode(order.customerCode || "");
      setCustomerName(order.customerName || ""); setCustomerShortName(order.customerShortName || "");
      setProductCode(order.productCode || ""); setProductName(order.productName || "");
      setOrderUnit(""); setOrderQuantity("");
      setReceiptAccount(order.receiptAccount || ""); setReceiptAmount(order.receiptAmount?.toString() || "");
      setAmount(order.amount?.toString() || ""); setDiscountAmount(order.discountAmount?.toString() || "");
      setWarehouse(order.warehouse || ""); setHandler(order.handler || "");
      setReceiptDate(order.receiptDate?.split("T")[0] || ""); setContent(order.content || "");
      setDepartment(order.department || ""); setSorter(order.sorter || ""); setRemark(order.remark || "");
    } else {
      setDocumentNo(""); setDeliveryDate(""); setSelfNo(""); setCustomerCode(""); setCustomerName("");
      setCustomerShortName(""); setProductCode(""); setProductName(""); setOrderUnit(""); setOrderQuantity("");
      setReceiptAccount(""); setReceiptAmount(""); setAmount(""); setDiscountAmount("");
      setWarehouse(""); setHandler(""); setReceiptDate(""); setContent(""); setDepartment("");
      setSorter(""); setRemark("");
    }
  }, [order, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!documentNo) { toast.error("单据编号不能为空"); return; }
    setLoading(true);
    try {
      const payload = {
        documentNo, deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : null,
        selfNo: selfNo || null, customerCode: customerCode || null,
        customerName: customerName || null, customerShortName: customerShortName || null,
        productCode: productCode || null, productName: productName || null,
        orderUnit: orderUnit || null, orderQuantity: safeParseInt(orderQuantity),
        receiptAccount: receiptAccount || null, receiptAmount: safeParseFloat(receiptAmount),
        amount: safeParseFloat(amount), discountAmount: safeParseFloat(discountAmount),
        warehouse: warehouse || null, handler: handler || null,
        receiptDate: receiptDate ? new Date(receiptDate).toISOString() : null,
        content: content || null, department: department || null,
        sorter: sorter || null, remark: remark || null,
        lastModifiedBy: isEdit ? "admin" : undefined, createdBy: isEdit ? undefined : "admin", preparedBy: "admin",
      };
      const url = isEdit ? `/api/admin/sales-orders/${order!.id}` : "/api/admin/sales-orders";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) { toast.success(isEdit ? "销售单更新成功" : "销售单创建成功"); onSuccess(); }
      else toast.error(json.error || "操作失败");
    } catch { toast.error("网络错误"); }
    finally { setLoading(false); }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isEdit ? "编辑销售单" : "新建销售单"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="basic" className="pt-2">
              <TabsList className="w-full">
                <TabsTrigger value="basic" className="flex-1">基本</TabsTrigger>
                <TabsTrigger value="amount" className="flex-1">金额</TabsTrigger>
                <TabsTrigger value="other" className="flex-1">其他</TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>单据编号 <span className="text-red-500">*</span></Label><Input value={documentNo} onChange={(e) => setDocumentNo(e.target.value)} disabled={isEdit} required /></div>
                  <div className="space-y-2"><Label>自编号</Label><Input value={selfNo} onChange={(e) => setSelfNo(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>交货日期</Label><Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} /></div>
                  <div className="space-y-2"><Label>出货仓库</Label><Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                  <div className="space-y-2"><Label>客户编码</Label><Input value={customerCode} disabled className="bg-muted" /></div>
                  <Button type="button" variant="outline" size="icon" className="mb-0.5" onClick={() => setCustPickerOpen(true)} title="选择客户"><SearchIcon className="size-4" /></Button>
                  <div className="space-y-2"><Label>购货单位</Label><Input value={customerName} disabled className="bg-muted" /></div>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                  <div className="space-y-2"><Label>商品编码</Label><Input value={productCode} disabled className="bg-muted" /></div>
                  <Button type="button" variant="outline" size="icon" className="mb-0.5" onClick={() => setProdPickerOpen(true)} title="选择商品"><SearchIcon className="size-4" /></Button>
                  <div className="space-y-2"><Label>商品名称</Label><Input value={productName} disabled className="bg-muted" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>单位</Label><Input value={orderUnit} disabled className="bg-muted" /></div>
                  <div className="space-y-2"><Label>数量</Label><Input type="number" step="0.1" value={orderQuantity} onChange={(e) => setOrderQuantity(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>经手人</Label><Input value={handler} onChange={(e) => setHandler(e.target.value)} /></div>
                  <div className="space-y-2"><Label>部门</Label><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
                </div>
              </TabsContent>
              <TabsContent value="amount" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>收款金额</Label><Input type="number" step="0.01" value={receiptAmount} onChange={(e) => setReceiptAmount(e.target.value)} /></div>
                  <div className="space-y-2"><Label>优惠金额</Label><Input type="number" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>金额</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>收款账户</Label><Input value={receiptAccount} onChange={(e) => setReceiptAccount(e.target.value)} /></div>
                  <div className="space-y-2"><Label>收款日期</Label><Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} /></div>
                </div>
              </TabsContent>
              <TabsContent value="other" className="space-y-4 pt-4">
                <div className="space-y-2"><Label>单据内容</Label><Input value={content} onChange={(e) => setContent(e.target.value)} /></div>
                <div className="space-y-2"><Label>分拣员</Label><Input value={sorter} onChange={(e) => setSorter(e.target.value)} /></div>
                <div className="space-y-2"><Label>说明</Label><Input value={remark} onChange={(e) => setRemark(e.target.value)} /></div>
              </TabsContent>
            </Tabs>
            <div className="flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit" disabled={loading}>{loading ? "保存中..." : "保存"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 客户选择弹窗 */}
      <Dialog open={custPickerOpen} onOpenChange={setCustPickerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>选择客户</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <Input placeholder="搜索客户..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchCust(custSearch)} />
              <Button variant="secondary" onClick={() => searchCust(custSearch)}>搜索</Button>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>编码</TableHead><TableHead>名称</TableHead><TableHead>简称</TableHead></TableRow></TableHeader>
                <TableBody>{custList.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => selectCustomer(c)}>
                    <TableCell className="font-mono text-xs">{c.code}</TableCell><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.shortName || "-"}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 商品选择弹窗 */}
      <Dialog open={prodPickerOpen} onOpenChange={setProdPickerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>选择商品</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <Input placeholder="搜索商品..." value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && searchProd(prodSearch)} />
              <Button variant="secondary" onClick={() => searchProd(prodSearch)}>搜索</Button>
            </div>
            <div className="max-h-64 overflow-y-auto border rounded-md">
              <Table>
                <TableHeader><TableRow><TableHead>编码</TableHead><TableHead>名称</TableHead><TableHead>单位</TableHead></TableRow></TableHeader>
                <TableBody>{prodList.map((p) => (
                  <TableRow key={p.code} className="cursor-pointer hover:bg-muted/50" onClick={() => selectProduct(p)}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.unit?.name || "-"}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
