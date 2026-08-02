"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CustomerItem } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerItem | null;
  onSuccess: () => void;
}

export default function CustomerFormDialog({ open, onOpenChange, customer, onSuccess }: Props) {
  const isEdit = customer !== null;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setCode(customer.code);
      setName(customer.name);
      setShortName(customer.shortName || "");
      setPinyin(customer.pinyin || "");
      setContactPerson(customer.contactPerson || "");
      setPhone(customer.phone || "");
      setMobile(customer.mobile || "");
      setEmail(customer.email || "");
      setAddress(customer.address || "");
    } else {
      setCode("（自动生成）");
      setName(""); setShortName(""); setPinyin("");
      setContactPerson(""); setPhone(""); setMobile("");
      setEmail(""); setAddress("");
    }
  }, [customer, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) { toast.error("单位名称不能为空"); return; }

    setLoading(true);
    try {
      const payload = { name, shortName: shortName || null, pinyin: pinyin || null,
        contactPerson: contactPerson || null, phone: phone || null,
        mobile: mobile || null, email: email || null, address: address || null };

      const url = isEdit ? `/api/custom/${customer!.id}` : "/api/custom";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "客户更新成功" : "客户创建成功");
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑客户" : "添加客户"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>单位编码</Label>
            <Input value={code} disabled className="bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cname">单位名称 <span className="text-red-500">*</span></Label>
              <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="csname">单位简称</Label>
              <Input id="csname" value={shortName} onChange={(e) => setShortName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpy">拼音码</Label>
              <Input id="cpy" value={pinyin} onChange={(e) => setPinyin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccontact">联系人</Label>
              <Input id="ccontact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cphone">电话</Label>
              <Input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cmobile">手机</Label>
              <Input id="cmobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cemail">邮箱</Label>
            <Input id="cemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="caddr">地址</Label>
            <Input id="caddr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : isEdit ? "保存修改" : "创建客户"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
