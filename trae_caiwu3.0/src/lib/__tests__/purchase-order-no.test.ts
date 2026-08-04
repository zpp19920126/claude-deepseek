import { describe, it, expect } from "vitest";
import { generatePurchaseOrderNo } from "@/lib/order-no";

// Prisma 事务客户端的最小 mock
function makeTx(countValue: number) {
  return {
    purchaseOrder: {
      count: async () => countValue,
    },
  } as unknown as Parameters<typeof generatePurchaseOrderNo>[0];
}

describe("generatePurchaseOrderNo", () => {
  it("当日首张编号为 JH + 日期 + 0001", async () => {
    const no = await generatePurchaseOrderNo(makeTx(0));
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(no).toBe(`JH${today}0001`);
  });

  it("已有 5 张时生成第 6 张序号", async () => {
    const no = await generatePurchaseOrderNo(makeTx(5));
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    expect(no).toBe(`JH${today}0006`);
  });

  it("序号补零到 4 位", async () => {
    const no = await generatePurchaseOrderNo(makeTx(0));
    expect(no.endsWith("0001")).toBe(true);
  });
});
