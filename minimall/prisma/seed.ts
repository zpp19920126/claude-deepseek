import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 创建 admin 用户
  const admin = await prisma.user.upsert({
    where: { email: "admin@minimall.com" },
    update: {},
    create: {
      email: "admin@minimall.com",
      name: "管理员",
      passwordHash: hashSync("admin123", 10),
      role: "ADMIN",
    },
  });
  console.log("Admin user:", admin.email);

  // 创建示例分类
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "electronics" },
      update: {},
      create: { name: "电子产品", slug: "electronics", description: "手机、电脑、数码配件等" },
    }),
    prisma.category.upsert({
      where: { slug: "clothing" },
      update: {},
      create: { name: "服装鞋帽", slug: "clothing", description: "男装、女装、鞋类、配饰" },
    }),
    prisma.category.upsert({
      where: { slug: "food" },
      update: {},
      create: { name: "食品饮料", slug: "food", description: "零食、饮料、生鲜" },
    }),
    prisma.category.upsert({
      where: { slug: "home" },
      update: {},
      create: { name: "家居生活", slug: "home", description: "家具、家纺、厨具、日用品" },
    }),
  ]);
  console.log("Categories:", categories.map((c) => c.name).join(", "));

  // 创建示例商品
  const products = [
    { name: "无线蓝牙耳机", price: 299, stock: 100, categoryId: categories[0].id, description: "高品质降噪蓝牙耳机，续航24小时" },
    { name: "机械键盘", price: 599, stock: 50, categoryId: categories[0].id, description: "Cherry MX 青轴，RGB 背光" },
    { name: "纯棉T恤", price: 99, stock: 200, categoryId: categories[1].id, description: "100%新疆长绒棉，舒适透气" },
    { name: "运动跑鞋", price: 399, stock: 80, categoryId: categories[1].id, description: "轻便透气，适合日常跑步" },
    { name: "有机坚果礼盒", price: 168, stock: 150, categoryId: categories[2].id, description: "精选六种坚果，健康零食" },
    { name: "保温杯", price: 89, stock: 300, categoryId: categories[3].id, description: "316不锈钢，12小时保温" },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }
  console.log("Products: created", products.length, "items");

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
