"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface PrintOrder {
  documentNo: string;
  deliveryDate: string | null;
  selfNo: string | null;
  customerName: string | null;
  customerShortName: string | null;
  customerCode: string | null;
  productName: string | null;
  productCode: string | null;
  orderUnit: string | null;
  orderQuantity: number | null;
  receiptAccount: string | null;
  receiptAmount: number | null;
  receiptDate: string | null;
  amount: number | null;
  discountAmount: number | null;
  warehouse: string | null;
  handler: string | null;
  department: string | null;
  content: string | null;
  remark: string | null;
  sorter: string | null;
  preparedBy: string | null;
  createdAt: string;
  customer?: { name: string; shortName: string | null; code: string; phone: string | null; address: string | null } | null;
  product?: { name: string; code: string } | null;
}

function fmtDate(d: string | null) {
  if (!d) return "-";
  return d.split("T")[0];
}

function fmtMoney(v: number | null) {
  if (v == null) return "-";
  return `¥${v.toFixed(2)}`;
}

export default function SalePrintClient({ order }: { order: PrintOrder }) {
  useEffect(() => {
    // 页面加载后自动打开打印对话框
    const timer = setTimeout(() => window.print(), 500);
    return () => clearTimeout(timer);
  }, []);

  const cust = order.customer;

  return (
    <>
      {/* 打印控制栏 — 屏幕可见，打印时隐藏 */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex gap-3 print:hidden">
        <Button onClick={() => window.print()}>🖨️ 打印</Button>
        <Button variant="outline" onClick={() => window.close()}>关闭</Button>
      </div>

      {/* 打印内容 */}
      <div className="max-w-[210mm] mx-auto p-8 bg-white text-sm">
        {/* 标题 */}
        <div className="text-center mb-6 pb-4">
          <h1 className="text-2xl font-bold tracking-wider">🥬 绿粮蔬菜配送</h1>
          <p className="text-base font-semibold mt-1">销 售 单</p>
        </div>

        {/* 单据信息行 */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-xs border rounded-md p-3 bg-gray-50">
          <div><span className="text-gray-500">单据编号：</span><span className="font-mono font-semibold">{order.documentNo}</span></div>
          <div><span className="text-gray-500">自编号：</span>{order.selfNo || "-"}</div>
          <div><span className="text-gray-500">日期：</span>{fmtDate(order.createdAt)}</div>
        </div>

        {/* 客户信息 */}
        <div className="border-2 border-black p-3 mb-4">
          <h3 className="font-semibold text-xs mb-2 bg-gray-100 px-2 py-0.5 inline-block">购货单位</h3>
          <div className="grid grid-cols-2 gap-2 text-xs mt-2">
            <div>单位名称：<span className="font-semibold">{cust?.name || order.customerName || "-"}</span></div>
            <div>简称：{cust?.shortName || order.customerShortName || "-"}</div>
            <div>客户编码：<span className="font-mono">{cust?.code || order.customerCode || "-"}</span></div>
            <div>电话：{cust?.phone || "-"}</div>
            <div className="col-span-2">地址：{cust?.address || "-"}</div>
          </div>
        </div>

        {/* 商品明细 */}
        <table className="w-full border-collapse mb-4 text-xs border-2 border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-1 text-left border-r border-b-2 border-b-black">商品编码</th>
              <th className="py-2 px-1 text-left border-r border-b-2 border-b-black">商品名称</th>
              <th className="py-2 px-1 text-center border-r border-b-2 border-b-black">单位</th>
              <th className="py-2 px-1 text-right border-r border-b-2 border-b-black">数量</th>
              <th className="py-2 px-1 text-right border-r border-b-2 border-b-black">收款金额</th>
              <th className="py-2 px-1 text-right border-r border-b-2 border-b-black">优惠金额</th>
              <th className="py-2 px-1 text-center border-b-2 border-b-black w-16">签字</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-1 font-mono border-r border-b">{order.productCode || order.product?.code || "-"}</td>
              <td className="py-2 px-1 border-r border-b">{order.productName || order.product?.name || "-"}</td>
              <td className="py-2 px-1 text-center border-r border-b">{order.orderUnit || "-"}</td>
              <td className="py-2 px-1 text-right border-r border-b">{order.orderQuantity ?? "-"}</td>
              <td className="py-2 px-1 text-right border-r border-b">{fmtMoney(order.receiptAmount)}</td>
              <td className="py-2 px-1 text-right border-r border-b">{fmtMoney(order.discountAmount)}</td>
              <td className="py-2 px-1 text-center border-b min-h-[28px]"></td>
            </tr>
          </tbody>
        </table>

        {/* 金额汇总 */}
        <div className="flex justify-end mb-4">
          <div className="w-56 border-2 border-black text-xs">
            <div className="flex justify-between border-b border-gray-400 px-2 py-1.5">
              <span className="text-gray-500">收款金额</span>
              <span className="font-semibold">{fmtMoney(order.receiptAmount)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-400 px-2 py-1.5">
              <span className="text-gray-500">优惠金额</span>
              <span>{fmtMoney(order.discountAmount)}</span>
            </div>
            <div className="flex justify-between px-2 py-1.5 font-bold bg-gray-100">
              <span>合计</span>
              <span>{fmtMoney(order.amount)}</span>
            </div>
          </div>
        </div>

        {/* 其他信息 */}
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs border-2 border-black p-3 mb-4">
          <div><span className="text-gray-500">交货日期：</span>{fmtDate(order.deliveryDate)}</div>
          <div><span className="text-gray-500">收款日期：</span>{fmtDate(order.receiptDate)}</div>
          <div><span className="text-gray-500">收款账户：</span>{order.receiptAccount || "-"}</div>
          <div><span className="text-gray-500">出货仓库：</span>{order.warehouse || "-"}</div>
          <div><span className="text-gray-500">经手人：</span>{order.handler || "-"}</div>
          <div><span className="text-gray-500">部门：</span>{order.department || "-"}</div>
          <div><span className="text-gray-500">分拣员：</span>{order.sorter || "-"}</div>
          <div><span className="text-gray-500">制单人：</span>{order.preparedBy || "-"}</div>
          <div><span className="text-gray-500">备注：</span>{order.content || "-"}</div>
        </div>

        {order.remark && (
          <div className="mb-4 text-xs border-2 border-black p-2">
            <span className="text-gray-500">说明：</span>{order.remark}
          </div>
        )}

        {/* 页脚 */}
        <div className="mt-10 pt-3 text-center text-xs text-gray-400">
          绿粮蔬菜配送管理系统 · 打印时间：{new Date().toLocaleString("zh-CN")}
        </div>
      </div>
    </>
  );
}
