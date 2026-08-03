import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/features/purchase-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPurchasePage({ params }: PageProps) {
  const { id } = await params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: Number(id) },
    include: {
      supplier: { select: { id: true, name: true, shortName: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  if (!order) notFound();
  // 仅待收货状态可编辑，其余跳回详情
  if (order.status !== "pending") redirect(`/purchases/${order.id}`);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text">编辑进货单</h1>
        <p className="text-sm text-text-muted mt-1">
          订单号 <span className="font-mono">{order.orderNo}</span>（仅待收货状态可编辑）
        </p>
      </div>
      <PurchaseForm
        mode="edit"
        orderId={order.id}
        initialSupplier={{
          id: order.supplierId,
          name: order.supplier?.name || "",
        }}
        initialItems={order.items.map((item) => ({
          productId: item.productId,
          productName: item.product?.name || "",
          quantity: item.quantity,
          cost: item.cost,
        }))}
        initialRemark={order.remark}
      />
    </div>
  );
}
