import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import BatchPrintClient from "./BatchPrintClient";

export default async function BatchPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; ids?: string }>;
}) {
  if (!(await requireAdmin())) redirect("/login");
  const sp = await searchParams;

  let where: Prisma.SalesOrderWhereInput = {};

  if (sp.ids) {
    // 按 ID 列表查询
    const idList = sp.ids.split(",").filter(Boolean);
    where = { id: { in: idList } };
  } else if (sp.search) {
    where = {
      OR: [
        { documentNo: { contains: sp.search } },
        { customerName: { contains: sp.search } },
        { productName: { contains: sp.search } },
      ],
    };
  }

  const orders = await prisma.salesOrder.findMany({
    where,
    include: {
      customer: { select: { code: true, name: true, shortName: true, phone: true, address: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const data = orders.map((o) => ({
    ...o,
    deliveryDate: o.deliveryDate?.toISOString() ?? null,
    receiptDate: o.receiptDate?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }));

  return <BatchPrintClient orders={data} />;
}
