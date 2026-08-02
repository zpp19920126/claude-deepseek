"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { SupplierItem } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: SupplierItem | null;
  onSuccess: () => void;
}

export default function SupplierFormDialog({ open, onOpenChange, supplier, onSuccess }: Props) {
  const isEdit = supplier !== null;

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [orderStartTime, setOrderStartTime] = useState("");
  const [orderStopTime, setOrderStopTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      setCode(supplier.code);
      setName(supplier.name);
      setShortName(supplier.shortName || "");
      setPinyin(supplier.pinyin || "");
      setContactPerson(supplier.contactPerson || "");
      setPhone(supplier.phone || "");
      setMobile(supplier.mobile || "");
      setEmail(supplier.email || "");
      setAddress(supplier.address || "");
      setOrderStartTime(supplier.orderStartTime || "");
      setOrderStopTime(supplier.orderStopTime || "");
    } else {
      setCode("（自动生成）");
      setName(""); setShortName(""); setPinyin("");
      setContactPerson(""); setPhone(""); setMobile("");
      setEmail(""); setAddress("");
      setOrderStartTime(""); setOrderStopTime("");
    }
  }, [supplier, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) { toast.error("单位名称不能为空"); return; }

    setLoading(true);
    try {
      const payload = {
        name, shortName: shortName || null, pinyin: pinyin || null,
        contactPerson: contactPerson || null, phone: phone || null,
        mobile: mobile || null, email: email || null, address: address || null,
        orderStartTime: orderStartTime || null, orderStopTime: orderStopTime || null,
      };

      const url = isEdit ? `/api/supplier/${supplier!.id}` : "/api/supplier";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(isEdit ? "供应商更新成功" : "供应商创建成功");
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
          <DialogTitle>{isEdit ? "编辑供应商" : "添加供应商"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>单位编码</Label>
            <Input value={code} disabled className="bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sname">单位名称 <span className="text-red-500">*</span></Label>
              <Input id="sname" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ssname">单位简称</Label>
              <Input id="ssname" value={shortName} onChange={(e) => setShortName(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spy">拼音码</Label>
              <Input id="spy" value={pinyin} onChange={(e) => setPinyin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scontact">联系人</Label>
              <Input id="scontact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sphone">电话</Label>
              <Input id="sphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smobile">手机</Label>
              <Input id="smobile" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="semail">邮箱</Label>
            <Input id="semail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saddr">地址</Label>
            <Input id="saddr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sstart">开始接单时间</Label>
              <Input id="sstart" value={orderStartTime} onChange={(e) => setOrderStartTime(e.target.value)} placeholder="如 06:00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sstop">停止接单时间</Label>
              <Input id="sstop" value={orderStopTime} onChange={(e) => setOrderStopTime(e.target.value)} placeholder="如 18:00" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : isEdit ? "保存修改" : "创建供应商"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
