import { PurchaseForm } from "@/components/features/purchase-form";

export const dynamic = "force-dynamic";

export default function NewPurchasePage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text">新建进货单</h1>
        <p className="text-sm text-text-muted mt-1">
          填写供应商与商品明细，保存后状态为「待收货」，收货时自动增加库存并更新成本价
        </p>
      </div>
      <PurchaseForm mode="create" />
    </div>
  );
}
