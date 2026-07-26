import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

// 从 Prisma 查询推导类型，避免手动 Pick
type ProductCardData = Prisma.ProductGetPayload<{
  include: {
    category: { select: { id: true; name: true; slug: true } };
    images: { take: 1; orderBy: { sortOrder: "asc" } };
  };
}>;

type ProductCardProps = {
  product: ProductCardData;
};

/**
 * 商品卡片组件
 */
export function ProductCard({ product }: ProductCardProps) {
  const firstImage = product.images[0];

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-200"
    >
      {/* 商品图片 */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage.data}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {product.stock === 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            已售罄
          </div>
        )}
      </div>

      {/* 商品信息 */}
      <div className="p-4">
        {product.category && (
          <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
            {product.category.name}
          </span>
        )}
        <h3 className="mt-2 font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-lg font-bold text-red-500">
            {formatPrice(product.price)}
          </span>
          {product.stock > 0 && product.stock <= 10 && (
            <span className="text-xs text-orange-500">仅剩 {product.stock} 件</span>
          )}
        </div>
      </div>
    </Link>
  );
}
