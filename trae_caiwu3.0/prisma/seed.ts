import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("开始种子数据初始化...");

  // ==================== 创建用户 ====================
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: adminPassword,
      name: "管理员",
      role: "admin",
    },
  });

  const user = await prisma.user.upsert({
    where: { username: "user" },
    update: {},
    create: {
      username: "user",
      password: userPassword,
      name: "操作员",
      role: "user",
    },
  });

  console.log(`用户创建完成: admin(${admin.id}), user(${user.id})`);

  // ==================== 创建基本单位 ====================
  const unitData = [
    { code: "U001", name: "斤" },
    { code: "U002", name: "公斤" },
    { code: "U003", name: "个" },
    { code: "U004", name: "箱" },
    { code: "U005", name: "包" },
    { code: "U006", name: "把" },
    { code: "U007", name: "份" },
  ];
  const units = await Promise.all(
    unitData.map((u) =>
      prisma.unit.upsert({
        where: { code: u.code },
        update: {},
        create: u,
      })
    )
  );
  console.log(`单位创建完成: ${units.length} 个`);

  // ==================== 创建商品分类 ====================
  const leafVeg = await prisma.category.upsert({
    where: { code: "C001" },
    update: {},
    create: { code: "C001", name: "叶菜类", shortName: "叶菜", sortOrder: 1 },
  });
  const rootVeg = await prisma.category.upsert({
    where: { code: "C002" },
    update: {},
    create: { code: "C002", name: "根茎类", shortName: "根茎", sortOrder: 2 },
  });
  const fruitVeg = await prisma.category.upsert({
    where: { code: "C003" },
    update: {},
    create: { code: "C003", name: "瓜果类", shortName: "瓜果", sortOrder: 3 },
  });
  const solanaceous = await prisma.category.upsert({
    where: { code: "C004" },
    update: {},
    create: { code: "C004", name: "茄果类", shortName: "茄果", sortOrder: 4 },
  });
  const seasoning = await prisma.category.upsert({
    where: { code: "C005" },
    update: {},
    create: { code: "C005", name: "调味类", shortName: "调味", sortOrder: 5 },
  });
  console.log("分类创建完成: 5 个");

  // ==================== 创建商品 ====================
  const unitMap = Object.fromEntries(units.map((u) => [u.name, u.id]));

  const products = [
    { name: "大白菜", sku: "VG-001", category: leafVeg.id, unit: "斤", price: 2.5, cost: 1.8, stock: 200, minStock: 50 },
    { name: "菠菜", sku: "VG-002", category: leafVeg.id, unit: "斤", price: 4.0, cost: 3.0, stock: 100, minStock: 30 },
    { name: "生菜", sku: "VG-003", category: leafVeg.id, unit: "斤", price: 3.5, cost: 2.5, stock: 80, minStock: 20 },
    { name: "芹菜", sku: "VG-004", category: leafVeg.id, unit: "斤", price: 3.0, cost: 2.0, stock: 60, minStock: 20 },
    { name: "土豆", sku: "VG-005", category: rootVeg.id, unit: "斤", price: 2.0, cost: 1.5, stock: 300, minStock: 100 },
    { name: "胡萝卜", sku: "VG-006", category: rootVeg.id, unit: "斤", price: 2.5, cost: 1.8, stock: 250, minStock: 50 },
    { name: "白萝卜", sku: "VG-007", category: rootVeg.id, unit: "斤", price: 1.8, cost: 1.2, stock: 180, minStock: 50 },
    { name: "西红柿", sku: "VG-008", category: solanaceous.id, unit: "斤", price: 4.5, cost: 3.5, stock: 150, minStock: 40 },
    { name: "青椒", sku: "VG-009", category: solanaceous.id, unit: "斤", price: 5.0, cost: 4.0, stock: 40, minStock: 30 },
    { name: "茄子", sku: "VG-010", category: solanaceous.id, unit: "斤", price: 3.5, cost: 2.5, stock: 90, minStock: 30 },
    { name: "黄瓜", sku: "VG-011", category: fruitVeg.id, unit: "斤", price: 3.0, cost: 2.2, stock: 120, minStock: 40 },
    { name: "冬瓜", sku: "VG-012", category: fruitVeg.id, unit: "斤", price: 2.0, cost: 1.5, stock: 200, minStock: 50 },
    { name: "南瓜", sku: "VG-013", category: fruitVeg.id, unit: "斤", price: 2.5, cost: 1.8, stock: 150, minStock: 40 },
    { name: "大葱", sku: "VG-014", category: seasoning.id, unit: "把", price: 2.0, cost: 1.5, stock: 100, minStock: 30 },
    { name: "生姜", sku: "VG-015", category: seasoning.id, unit: "斤", price: 6.0, cost: 5.0, stock: 50, minStock: 20 },
    { name: "大蒜", sku: "VG-016", category: seasoning.id, unit: "斤", price: 7.0, cost: 5.5, stock: 25, minStock: 20 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        categoryId: p.category,
        unitId: unitMap[p.unit],
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        minStock: p.minStock,
        status: "active",
      },
    });
  }
  console.log(`商品创建完成: ${products.length} 个`);

  // ==================== 创建客户 ====================
  const customers = [
    { code: "K001", name: "阳光餐饮店", shortName: "阳光", phone: "13800138001", address: "城东区美食街12号", contact: "王老板" },
    { code: "K002", name: "好运饭店", shortName: "好运", phone: "13800138002", address: "城南区商业路88号", contact: "李经理" },
    { code: "K003", name: "学校食堂", shortName: "学校", phone: "13800138003", address: "大学城学府路1号", contact: "张主任" },
    { code: "K004", name: "天天超市", shortName: "天天", phone: "13800138004", address: "城中心广场路66号", contact: "赵店长" },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findUnique({ where: { code: c.code } });
    if (!existing) {
      await prisma.customer.create({ data: c });
    }
  }
  console.log(`客户创建完成: ${customers.length} 个`);

  // ==================== 创建供应商 ====================
  const suppliers = [
    { code: "G001", name: "绿源蔬菜批发", shortName: "绿源", phone: "13900139001", address: "农批市场A区10号", contact: "孙老板" },
    { code: "G002", name: "丰收农产", shortName: "丰收", phone: "13900139002", address: "农批市场B区25号", contact: "周经理" },
    { code: "G003", name: "田间直供", shortName: "田间", phone: "13900139003", address: "城郊农业园3号", contact: "吴师傅" },
  ];

  for (const s of suppliers) {
    const existing = await prisma.supplier.findUnique({ where: { code: s.code } });
    if (!existing) {
      await prisma.supplier.create({ data: s });
    }
  }
  console.log(`供应商创建完成: ${suppliers.length} 个`);

  console.log("\n种子数据初始化完成！");
  console.log("默认账号:");
  console.log("  管理员: admin / admin123");
  console.log("  操作员: user / user123");
}

main()
  .catch((e) => {
    console.error("种子数据初始化失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
