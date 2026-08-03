import { SalesForm } from "@/components/features/sales-form";

export const dynamic = "force-dynamic";

export default function NewSalesPage() {
  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-bold text-text">新建销售单</h1>
        <p className="text-sm text-text-muted mt-1">
          填写客户与商品明细，保存后状态为「待确认」，确认时自动扣减库存
        </p>
      </div>
      <SalesForm mode="create" />
    </div>
  );
}
