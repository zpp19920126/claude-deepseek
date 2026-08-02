import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import SalePrintClient from "./SalePrintClient";

export default async function SalePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireAdmin())) redirect("/login");
  const { id } = await params;

  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      customer: { select: { code: true, name: true, shortName: true, phone: true, address: true } },
      product: { select: { code: true, name: true } },
    },
  });

  if (!order) notFound();

  const data = {
    ...order,
    deliveryDate: order.deliveryDate?.toISOString() ?? null,
    receiptDate: order.receiptDate?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };

  return <SalePrintClient order={data} />;
}
