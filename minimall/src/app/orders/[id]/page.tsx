import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { PayButton } from "./PayButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "订单详情 - Mini Mall",
};

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * 订单详情页 — Server Component
 */
export default async function OrderDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: true,
      payment: {
        select: { id: true, amount: true, status: true, createdAt: true, paidAt: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const isPaid = order.status !== "PENDING_PAYMENT";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/orders" className="hover:text-blue-600">我的订单</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{order.orderNo}</span>
      </nav>

      {/* 订单状态 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-900">订单详情</h1>
          <OrderStatusBadge status={order.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">订单号：</span>
            <span>{order.orderNo}</span>
          </div>
          <div>
            <span className="text-gray-500">下单时间：</span>
            <span>{new Date(order.createdAt).toLocaleString("zh-CN")}</span>
          </div>
          {order.paidAt && (
            <div>
              <span className="text-gray-500">支付时间：</span>
              <span>{new Date(order.paidAt).toLocaleString("zh-CN")}</span>
            </div>
          )}
          {order.payment && (
            <div>
              <span className="text-gray-500">支付金额：</span>
              <span className="text-red-500 font-medium">{formatPrice(order.payment.amount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 商品明细 */}
      <div className="bg-white rounded-xl border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-medium text-gray-900">商品明细</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-4">
              {item.imageData && (
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={item.imageData} alt={item.productName} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.productName}</p>
                <p className="text-sm text-gray-500 mt-0.5">{formatPrice(item.price)} × {item.quantity}</p>
              </div>
              <p className="font-medium text-gray-900">{formatPrice(item.subtotal)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 金额汇总 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>商品原价</span>
            <span>{formatPrice(order.originalAmount)}</span>
          </div>
          {order.discountRate < 10000 && (
            <div className="flex justify-between text-green-600">
              <span>心悦折扣（{(order.discountRate / 100).toFixed(0)}%）</span>
              <span>-{formatPrice(order.originalAmount - order.totalAmount)}</span>
            </div>
          )}
          <hr className="border-gray-200" />
          <div className="flex justify-between text-lg font-bold text-red-500">
            <span>实付金额</span>
            <span>{formatPrice(order.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      {!isPaid && (
        <div className="flex justify-end">
          <PayButton orderId={order.id} />
        </div>
      )}
    </div>
  );
}
