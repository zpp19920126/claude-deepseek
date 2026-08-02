"use client";

import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";

interface Order {
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
}

function fmt(d: string | null) { return d ? d.split("T")[0] : "-"; }
function yuan(v: number | null) { return v != null ? `¥${v.toFixed(2)}` : "-"; }
function num(v: number | null) { return v != null ? v : "-"; }

export default function BatchPrintClient({ orders }: { orders: Order[] }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);

  const totalAmount = useMemo(() => orders.reduce((s, o) => s + (o.amount || 0), 0), [orders]);
  const totalReceipt = useMemo(() => orders.reduce((s, o) => s + (o.receiptAmount || 0), 0), [orders]);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 11px; }
          .no-print { display: none !important; }
          .print-table { border: 2px solid #000; }
          .print-table th, .print-table td { border-right: 1px solid #666; border-bottom: 1px solid #999; }
          .print-table th { border-bottom: 2px solid #000; }
          .print-table td:last-child, .print-table th:last-child { border-right: none; }
          .print-table tr:last-child td { border-bottom: 2px solid #000; }
          .print-table { page-break-inside: auto; }
          .print-table tr { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print fixed top-4 right-4 z-50 flex gap-3">
        <Button onClick={() => window.print()}>🖨️ 打印（{orders.length} 单）</Button>
        <Button variant="outline" onClick={() => window.close()}>关闭</Button>
      </div>

      <div className="max-w-[297mm] mx-auto p-4 bg-white">
        <div className="text-center mb-4 pb-3">
          <h1 className="text-xl font-bold">🥬 绿粮蔬菜配送 · 销售单列表</h1>
          <p className="text-xs text-gray-500 mt-1">共 {orders.length} 单 · 打印时间：{new Date().toLocaleString("zh-CN")}</p>
        </div>

        <table className="print-table w-full border-collapse text-xs border-2 border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-1.5 px-1 text-left border-r border-b-2 border-b-black">单据编号</th>
              <th className="py-1.5 px-1 text-left border-r border-b-2 border-b-black">自编号</th>
              <th className="py-1.5 px-1 text-left border-r border-b-2 border-b-black">交货日期</th>
              <th className="py-1.5 px-1 text-left border-r border-b-2 border-b-black">客户</th>
              <th className="py-1.5 px-1 text-left border-r border-b-2 border-b-black">商品</th>
              <th className="py-1.5 px-1 text-center border-r border-b-2 border-b-black">单位</th>
              <th className="py-1.5 px-1 text-right border-r border-b-2 border-b-black">数量</th>
              <th className="py-1.5 px-1 text-right border-r border-b-2 border-b-black">收款金额</th>
              <th className="py-1.5 px-1 text-right border-r border-b-2 border-b-black">优惠金额</th>
              <th className="py-1.5 px-1 text-right border-r border-b-2 border-b-black">金额</th>
              <th className="py-1.5 px-1 text-left border-r border-b-2 border-b-black">经手人</th>
              <th className="py-1.5 px-1 text-left border-r border-b-2 border-b-black">部门</th>
              <th className="py-1.5 px-1 text-left border-r border-b-2 border-b-black">说明</th>
              <th className="py-1.5 px-1 text-center border-b-2 border-b-black w-24">签字</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="py-1.5 px-1 font-mono border-r border-b">{o.documentNo}</td>
                <td className="py-1.5 px-1 border-r border-b">{o.selfNo || "-"}</td>
                <td className="py-1.5 px-1 border-r border-b">{fmt(o.deliveryDate)}</td>
                <td className="py-1.5 px-1 border-r border-b">{o.customer?.shortName || o.customerName || "-"}</td>
                <td className="py-1.5 px-1 border-r border-b">{o.productName || "-"}</td>
                <td className="py-1.5 px-1 text-center border-r border-b">{o.orderUnit || "-"}</td>
                <td className="py-1.5 px-1 text-right border-r border-b">{num(o.orderQuantity)}</td>
                <td className="py-1.5 px-1 text-right border-r border-b">{yuan(o.receiptAmount)}</td>
                <td className="py-1.5 px-1 text-right border-r border-b">{yuan(o.discountAmount)}</td>
                <td className="py-1.5 px-1 text-right border-r border-b font-semibold">{yuan(o.amount)}</td>
                <td className="py-1.5 px-1 border-r border-b">{o.handler || "-"}</td>
                <td className="py-1.5 px-1 border-r border-b">{o.department || "-"}</td>
                <td className="py-1.5 px-1 border-r border-b max-w-20 truncate">{o.remark || "-"}</td>
                <td className="py-1.5 px-1 border-b min-h-[24px]"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-gray-100">
              <td colSpan={7} className="py-2 px-1 text-right border-r border-t-2 border-t-black">合计（{orders.length} 单）：</td>
              <td className="py-2 px-1 text-right border-r border-t-2 border-t-black">{yuan(totalReceipt)}</td>
              <td className="py-2 px-1 border-r border-t-2 border-t-black"></td>
              <td className="py-2 px-1 text-right border-r border-t-2 border-t-black">{yuan(totalAmount)}</td>
              <td colSpan={4} className="border-t-2 border-t-black"></td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 pt-3 text-center text-xs text-gray-400">
          绿粮蔬菜配送管理系统
        </div>
      </div>
    </>
  );
}
