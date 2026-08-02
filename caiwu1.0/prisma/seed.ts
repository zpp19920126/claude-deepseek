import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始填充种子数据...\n");

  // 1. 管理员
  const passwordHash = hashSync("admin123", 12);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash, role: "ADMIN" },
  });
  console.log("✅ 管理员: admin / admin123");

  // 2. 基本单位
  const units = [
    { code: "jin", name: "斤" },
    { code: "kg", name: "公斤" },
    { code: "dai", name: "袋" },
    { code: "xiang", name: "箱" },
    { code: "kun", name: "捆" },
    { code: "ge", name: "个" },
  ];
  for (const u of units) {
    await prisma.unit.upsert({ where: { code: u.code }, update: {}, create: u });
  }
  console.log("✅ 基本单位: 6 个");

  // 3. 商品分类
  const categories = [
    { code: "LS01", name: "叶菜类", costSharingMethod: "按重量", sharingCount: 1, sorter: "张三" },
    { code: "LS02", name: "根茎类", costSharingMethod: "按重量", sharingCount: 1, sorter: "张三" },
    { code: "LS03", name: "果菜类", costSharingMethod: "按重量", sharingCount: 1, sorter: "李四" },
    { code: "LS04", name: "菌菇类", costSharingMethod: "按件数", sharingCount: 1, sorter: "王五" },
    { code: "LS05", name: "豆制品", costSharingMethod: "按件数", sharingCount: 1, sorter: "王五" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { code: c.code }, update: {}, create: c });
  }
  console.log("✅ 商品分类: 5 个");

  // 4. 供应商
  const sup1 = await prisma.supplier.upsert({
    where: { code: "SUP001" },
    update: {},
    create: {
      code: "SUP001",
      name: "山东寿光蔬菜基地",
      shortName: "寿光基地",
      priceMode: "批发价",
      address: "山东省寿光市蔬菜批发市场",
      phone: "0536-1234567",
      contactPerson: "王经理",
      region: "山东",
    },
  });
  const sup2 = await prisma.supplier.upsert({
    where: { code: "SUP002" },
    update: {},
    create: {
      code: "SUP002",
      name: "北京新发地批发市场",
      shortName: "新发地",
      priceMode: "批发价",
      address: "北京市丰台区新发地",
      phone: "010-87654321",
      contactPerson: "李经理",
      region: "北京",
    },
  });
  await prisma.supplier.upsert({
    where: { code: "SUP003" },
    update: {},
    create: {
      code: "SUP003",
      name: "本地有机农场",
      shortName: "有机农场",
      priceMode: "协议价",
      address: "本地市郊区",
      contactPerson: "赵场主",
      region: "本地",
    },
  });
  console.log("✅ 供应商: 3 个");

  // 5. 客户
  await prisma.customer.upsert({
    where: { code: "CUS001" },
    update: {},
    create: {
      code: "CUS001",
      name: "市政府机关食堂",
      shortName: "机关食堂",
      priceMode: "协议价",
      address: "市中心政府大院",
      phone: "010-11112222",
      contactPerson: "张主任",
      region: "市区",
    },
  });
  await prisma.customer.upsert({
    where: { code: "CUS002" },
    update: {},
    create: {
      code: "CUS002",
      name: "阳光国际学校",
      shortName: "阳光学校",
      priceMode: "批发价",
      address: "市高新区阳光路88号",
      phone: "010-33334444",
      contactPerson: "刘校长",
      region: "高新区",
    },
  });
  await prisma.customer.upsert({
    where: { code: "CUS003" },
    update: {},
    create: {
      code: "CUS003",
      name: "绿洲大酒店",
      shortName: "绿洲酒店",
      priceMode: "协议价",
      address: "市中心商业区",
      phone: "010-55556666",
      contactPerson: "陈经理",
      region: "市区",
    },
  });
  console.log("✅ 客户: 3 个");

  // 6. 商品
  const products = [
    {
      code: "VG001", name: "大白菜", shortName: "白菜", specification: "散装", unitCode: "jin",
      isRawVeg: true, isCleanVeg: false, yieldRate: 0.85, defaultSupplierId: sup1.id,
      defaultSupplierShortName: "寿光基地", origin: "山东", categoryCode: "LS01",
      shelfLife: 3, sorter: "张三", createdBy: "admin",
    },
    {
      code: "VG002", name: "西红柿", shortName: "番茄", specification: "散装", unitCode: "jin",
      isRawVeg: true, isCleanVeg: false, yieldRate: 0.95, defaultSupplierId: sup1.id,
      defaultSupplierShortName: "寿光基地", origin: "寿光", categoryCode: "LS03",
      shelfLife: 5, sorter: "李四", createdBy: "admin",
    },
    {
      code: "VG003", name: "土豆", shortName: "土豆", specification: "散装", unitCode: "jin",
      isRawVeg: true, isCleanVeg: false, yieldRate: 0.90, defaultSupplierId: sup2.id,
      defaultSupplierShortName: "新发地", origin: "内蒙古", categoryCode: "LS02",
      shelfLife: 30, sorter: "张三", createdBy: "admin",
    },
    {
      code: "VG004", name: "黄瓜", shortName: "黄瓜", specification: "散装", unitCode: "jin",
      isRawVeg: true, isCleanVeg: false, yieldRate: 0.95, defaultSupplierId: sup2.id,
      defaultSupplierShortName: "新发地", origin: "寿光", categoryCode: "LS03",
      shelfLife: 7, sorter: "李四", createdBy: "admin",
    },
    {
      code: "VG005", name: "菠菜", shortName: "菠菜", specification: "捆装", unitCode: "kun",
      isRawVeg: true, isCleanVeg: false, yieldRate: 0.80, defaultSupplierId: sup1.id,
      defaultSupplierShortName: "寿光基地", origin: "山东", categoryCode: "LS01",
      shelfLife: 2, sorter: "张三", createdBy: "admin",
    },
    {
      code: "VG006", name: "香菇", shortName: "香菇", specification: "袋装", unitCode: "dai",
      isRawVeg: true, isCleanVeg: false, yieldRate: 0.98, defaultSupplierId: sup2.id,
      defaultSupplierShortName: "新发地", origin: "福建", categoryCode: "LS04",
      shelfLife: 5, sorter: "王五", createdBy: "admin",
    },
    {
      code: "VG007", name: "豆腐", shortName: "豆腐", specification: "块装", unitCode: "ge",
      isRawVeg: false, isCleanVeg: true, yieldRate: 1.0, defaultSupplierId: sup2.id,
      defaultSupplierShortName: "新发地", origin: "本地", categoryCode: "LS05",
      shelfLife: 3, sorter: "王五", createdBy: "admin",
    },
    {
      code: "VG008", name: "胡萝卜", shortName: "胡萝卜", specification: "散装", unitCode: "jin",
      isRawVeg: true, isCleanVeg: false, yieldRate: 0.90, defaultSupplierId: sup1.id,
      defaultSupplierShortName: "寿光基地", origin: "山东", categoryCode: "LS02",
      shelfLife: 14, sorter: "张三", createdBy: "admin",
    },
    {
      code: "VG009", name: "青椒", shortName: "青椒", specification: "散装", unitCode: "jin",
      isRawVeg: true, isCleanVeg: false, yieldRate: 0.92, defaultSupplierId: sup2.id,
      defaultSupplierShortName: "新发地", origin: "海南", categoryCode: "LS03",
      shelfLife: 5, sorter: "李四", createdBy: "admin",
    },
    {
      code: "VG010", name: "净菜沙拉包", shortName: "沙拉包", specification: "袋装", unitCode: "dai",
      isRawVeg: false, isCleanVeg: true, yieldRate: 0.70, defaultSupplierId: sup2.id,
      defaultSupplierShortName: "新发地", origin: "本地", categoryCode: "LS01",
      shelfLife: 3, sorter: "张三", createdBy: "admin",
    },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }
  console.log("✅ 商品: 10 个");

  // 7. 销售单
  const orderCount = await prisma.salesOrder.count();
  if (orderCount === 0) {
    const customers = await prisma.customer.findMany();
    const prods = await prisma.product.findMany({ include: { category: true } });

    const orders = [
      {
        deliveryDate: new Date("2026-07-28"),
        documentNo: "20260728-A1B2",
        productCode: prods[0].code, productName: prods[0].name,
        customerCode: customers[0].code, customerName: customers[0].name, customerShortName: customers[0].shortName,
        orderUnit: "斤", orderQuantity: 50, deliveryUnit: "斤", deliveryQuantity: 50, receivedQuantity: 50,
        unitPrice: 1.5, amount: 75, discount: 0, discountAmount: 0,
        categoryCode: prods[0].categoryCode, supplierId: prods[0].defaultSupplierId,
        sorter: prods[0].sorter, createdBy: "admin", preparedBy: "admin",
      },
      {
        deliveryDate: new Date("2026-07-28"),
        documentNo: "20260728-C3D4",
        productCode: prods[1].code, productName: prods[1].name,
        customerCode: customers[1].code, customerName: customers[1].name, customerShortName: customers[1].shortName,
        orderUnit: "斤", orderQuantity: 30, deliveryUnit: "斤", deliveryQuantity: 30, receivedQuantity: 30,
        unitPrice: 3.5, amount: 105, discount: 0.05, discountAmount: 5.25,
        categoryCode: prods[1].categoryCode, supplierId: prods[1].defaultSupplierId,
        sorter: prods[1].sorter, createdBy: "admin", preparedBy: "admin",
      },
      {
        deliveryDate: new Date("2026-07-27"),
        documentNo: "20260727-E5F6",
        productCode: prods[2].code, productName: prods[2].name,
        customerCode: customers[2].code, customerName: customers[2].name, customerShortName: customers[2].shortName,
        orderUnit: "斤", orderQuantity: 40, deliveryUnit: "斤", deliveryQuantity: 40, receivedQuantity: 39,
        unitPrice: 2.0, amount: 80, discount: 0, discountAmount: 0,
        categoryCode: prods[2].categoryCode, supplierId: prods[2].defaultSupplierId,
        sorter: prods[2].sorter, createdBy: "admin", preparedBy: "admin",
      },
      {
        deliveryDate: new Date("2026-07-27"),
        documentNo: "20260727-G7H8",
        productCode: prods[6].code, productName: prods[6].name,
        customerCode: customers[0].code, customerName: customers[0].name, customerShortName: customers[0].shortName,
        orderUnit: "个", orderQuantity: 20, deliveryUnit: "个", deliveryQuantity: 20, receivedQuantity: 20,
        unitPrice: 2.5, amount: 50, discount: 0, discountAmount: 0,
        categoryCode: prods[6].categoryCode, supplierId: prods[6].defaultSupplierId,
        sorter: prods[6].sorter, createdBy: "admin", preparedBy: "admin",
      },
      {
        deliveryDate: new Date("2026-07-26"),
        documentNo: "20260726-I9J0",
        productCode: prods[9].code, productName: prods[9].name,
        customerCode: customers[1].code, customerName: customers[1].name, customerShortName: customers[1].shortName,
        orderUnit: "袋", orderQuantity: 10, deliveryUnit: "袋", deliveryQuantity: 10, receivedQuantity: 10,
        unitPrice: 15, amount: 150, discount: 0.10, discountAmount: 15,
        categoryCode: prods[9].categoryCode, supplierId: prods[9].defaultSupplierId,
        sorter: prods[9].sorter, createdBy: "admin", preparedBy: "admin",
      },
    ];

    for (const o of orders) {
      await prisma.salesOrder.create({ data: o });
    }
    console.log("✅ 销售单: 5 条");
  } else {
    console.log("⏭️  销售单已存在，跳过");
  }

  console.log("\n🎉 种子数据填充完成！");
  console.log("   登录账号: admin / admin123\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
