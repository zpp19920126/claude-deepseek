"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getCsrfToken } from "@/lib/utils";
import type { CustomerItem } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerItem | null;
  onSuccess: () => void;
}

export default function CustomerForm({ open, onOpenChange, customer, onSuccess }: Props) {
  const isEdit = customer !== null;
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [priceMode, setPriceMode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [fax, setFax] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [taxId, setTaxId] = useState("");
  const [bank, setBank] = useState("");
  const [region, setRegion] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");

  useEffect(() => {
    if (customer) {
      setCode(customer.code); setName(customer.name);
      setShortName(customer.shortName || ""); setPinyin(customer.pinyin || "");
      setPriceMode(customer.priceMode || ""); setAddress(customer.address || "");
      setPhone(customer.phone || ""); setMobile(customer.mobile || "");
      setEmail(customer.email || ""); setFax(customer.fax || "");
      setZipCode(customer.zipCode || ""); setContactPerson(customer.contactPerson || "");
      setTaxId(customer.taxId || ""); setBank(customer.bank || "");
      setRegion(customer.region || "");
      setContractStartDate(customer.contractStartDate?.split("T")[0] || "");
      setContractEndDate(customer.contractEndDate?.split("T")[0] || "");
    } else {
      setCode(""); setName(""); setShortName(""); setPinyin("");
      setPriceMode(""); setAddress(""); setPhone(""); setMobile("");
      setEmail(""); setFax(""); setZipCode(""); setContactPerson("");
      setTaxId(""); setBank(""); setRegion("");
      setContractStartDate(""); setContractEndDate("");
    }
  }, [customer, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name) { toast.error("单位编码和名称不能为空"); return; }
    setLoading(true);
    try {
      const payload = {
        code, name, shortName: shortName || null, pinyin: pinyin || null,
        priceMode: priceMode || null, address: address || null,
        phone: phone || null, mobile: mobile || null, email: email || null,
        fax: fax || null, zipCode: zipCode || null, contactPerson: contactPerson || null,
        taxId: taxId || null, bank: bank || null, region: region || null,
        contractStartDate: contractStartDate ? new Date(contractStartDate).toISOString() : null,
        contractEndDate: contractEndDate ? new Date(contractEndDate).toISOString() : null,
        updatedBy: "admin",
      };
      const url = isEdit ? `/api/admin/customers/${customer!.id}` : "/api/admin/customers";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) { toast.success(isEdit ? "客户更新成功" : "客户创建成功"); onSuccess(); }
      else toast.error(json.error || "操作失败");
    } catch { toast.error("网络错误"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "编辑客户" : "添加客户"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="basic" className="flex-1">基本信息</TabsTrigger>
              <TabsTrigger value="contact" className="flex-1">联系方式</TabsTrigger>
              <TabsTrigger value="finance" className="flex-1">财务/合同</TabsTrigger>
            </TabsList>
            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>单位编码 <span className="text-red-500">*</span></Label><Input value={code} onChange={(e) => setCode(e.target.value)} disabled={isEdit} required /></div>
                <div className="space-y-2"><Label>单位名称 <span className="text-red-500">*</span></Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>单位简称</Label><Input value={shortName} onChange={(e) => setShortName(e.target.value)} /></div>
                <div className="space-y-2"><Label>拼音码</Label><Input value={pinyin} onChange={(e) => setPinyin(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>地区</Label><Input value={region} onChange={(e) => setRegion(e.target.value)} /></div>
                <div className="space-y-2"><Label>价格模式</Label><Input value={priceMode} onChange={(e) => setPriceMode(e.target.value)} placeholder="批发价/协议价" /></div>
              </div>
              <div className="space-y-2"><Label>地址</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            </TabsContent>
            <TabsContent value="contact" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>联系人</Label><Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} /></div>
                <div className="space-y-2"><Label>电话</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>手机</Label><Input value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
                <div className="space-y-2"><Label>邮箱</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>传真</Label><Input value={fax} onChange={(e) => setFax(e.target.value)} /></div>
                <div className="space-y-2"><Label>邮编</Label><Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} /></div>
              </div>
            </TabsContent>
            <TabsContent value="finance" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>税号</Label><Input value={taxId} onChange={(e) => setTaxId(e.target.value)} /></div>
                <div className="space-y-2"><Label>开户行</Label><Input value={bank} onChange={(e) => setBank(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>合同开始日期</Label><Input type="date" value={contractStartDate} onChange={(e) => setContractStartDate(e.target.value)} /></div>
                <div className="space-y-2"><Label>合同结束日期</Label><Input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} /></div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={loading}>{loading ? "保存中..." : "保存"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
