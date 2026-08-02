import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AdminDashboard() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [productCount, customerCount, todayOrderCount, monthlySales] =
    await Promise.all([
      prisma.product.count(),
      prisma.customer.count(),
      prisma.salesOrder.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.salesOrder.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: monthStart } },
      }),
    ]);

  const stats = [
    { title: "商品总数", value: productCount, href: "/admin/products" },
    { title: "客户总数", value: customerCount, href: "/admin/customers" },
    { title: "今日单据", value: todayOrderCount, href: "/admin/sales-orders" },
    {
      title: "本月销售额",
      value: `¥${(monthlySales._sum.amount || 0).toFixed(2)}`,
      href: "/admin/sales-orders",
    },
  ];

  const shortcuts = [
    { title: "商品管理", desc: "管理商品信息、分类和单位", href: "/admin/products", icon: "🥬" },
    { title: "客户管理", desc: "管理客户单位和联系方式", href: "/admin/customers", icon: "🏢" },
    { title: "供应商管理", desc: "管理供应商信息和合同", href: "/admin/suppliers", icon: "🚚" },
    { title: "销售单管理", desc: "创建和管理销售单据", href: "/admin/sales-orders", icon: "📋" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">仪表盘</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {s.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="text-lg font-semibold mt-8">快速入口</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shortcuts.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <p className="text-2xl mb-2">{s.icon}</p>
                <p className="font-semibold">{s.title}</p>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
