import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SalesForm } from "@/components/features/sales-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSalesPage({ params }: PageProps) {
  const { id } = await params;
  const order = await prisma.salesOrder.findUnique({
    where: { id: Number(id) },
    include: {
      customer: { select: { id: true, name: true, shortName: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  if (!order) notFound();
  // 仅待确认状态可编辑，其余跳回详情
  if (order.status !== "pending") redirect(`/sales/${order.id}`);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text">编辑销售单</h1>
        <p className="text-sm text-text-muted mt-1">
          订单号 <span className="font-mono">{order.orderNo}</span>（仅待确认状态可编辑）
        </p>
      </div>
      <SalesForm
        mode="edit"
        orderId={order.id}
        initialCustomer={{
          id: order.customerId,
          name: order.customer?.name || "",
        }}
        initialItems={order.items.map((item) => ({
          productId: item.productId,
          productName: item.product?.name || "",
          quantity: item.quantity,
          price: item.price,
        }))}
        initialRemark={order.remark}
      />
    </div>
  );
}
