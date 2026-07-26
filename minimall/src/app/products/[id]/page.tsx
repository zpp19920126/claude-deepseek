import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";
import { notFound } from "next/navigation";
import { AddToCartButton } from "./AddToCartButton";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

/**
 * 商品详情页
 * 展示大图、商品信息、分类、库存、加购按钮
 */
export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product || product.status === "INACTIVE") {
    notFound();
  }

  const mainImage = product.images[0];
  const otherImages = product.images.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* 面包屑导航 — 使用 Link 组件实现 SPA 导航 */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600">首页</Link>
        {product.category && (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/?category=${product.category.slug}`}
              className="hover:text-blue-600"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-900">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧：商品图片 */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {mainImage ? (
              <img
                src={mainImage.data}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          {otherImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {otherImages.map((img) => (
                <div
                  key={img.id}
                  className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                >
                  <img
                    src={img.data}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：商品信息 */}
        <div className="space-y-6">
          {product.category && (
            <Link
              href={`/?category=${product.category.slug}`}
              className="inline-block text-xs text-blue-500 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-500">
              {formatPrice(product.price)}
            </span>
          </div>

          {/* 库存状态 */}
          <div className="flex items-center gap-4">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                有货
                {product.stock <= 10 && (
                  <span className="text-orange-500 ml-1">（仅剩 {product.stock} 件）</span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-red-500">
                <span className="w-2 h-2 bg-red-500 rounded-full" />
                已售罄
              </span>
            )}
          </div>

          {product.description && (
            <div>
              <h2 className="text-sm font-medium text-gray-700 mb-2">商品描述</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          <hr className="border-gray-200" />

          <AddToCartButton
            productId={product.id}
            productName={product.name}
            productPrice={product.price}
            productImage={mainImage?.data || null}
            disabled={product.stock === 0}
          />

          <p className="text-xs text-gray-400">商品编号：{product.id}</p>
        </div>
      </div>
    </div>
  );
}
