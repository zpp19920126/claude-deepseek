"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { getCsrfToken } from "@/lib/client-utils";

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  stock: number;
  quantity: number;
  subtotal: number;
  image: string | null;
}

/**
 * 购物车客户端组件
 * 加载购物车数据、修改数量、删除商品
 */
export function CartClient() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 加载购物车
  const loadCart = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      } else {
        setError(data.error || "加载失败");
      }
    } catch {
      setError("网络异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // 修改数量
  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity < 1) return;
      setError("");
      try {
        const res = await fetch(`/api/cart/${itemId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": getCsrfToken(),
          },
          body: JSON.stringify({ quantity }),
        });
        const data = await res.json();
        if (data.success) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === itemId ? { ...item, quantity, subtotal: item.price * quantity } : item
            )
          );
        } else {
          setError(data.error || "操作失败");
        }
      } catch {
        setError("网络异常");
      }
    },
    []
  );

  // 删除
  const removeItem = useCallback(
    async (itemId: string) => {
      setError("");
      try {
        const res = await fetch(`/api/cart/${itemId}`, {
          method: "DELETE",
          headers: { "x-csrf-token": getCsrfToken() },
        });
        const data = await res.json();
        if (data.success) {
          setItems((prev) => prev.filter((item) => item.id !== itemId));
        } else {
          setError(data.error || "删除失败");
        }
      } catch {
        setError("网络异常");
      }
    },
    []
  );

  const [submitting, setSubmitting] = useState(false);

  // 提交订单
  const handleSubmitOrder = useCallback(async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "x-csrf-token": getCsrfToken() },
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/orders/${data.data.id}`);
      } else {
        setError(data.error || "提交失败");
      }
    } catch {
      setError("网络异常");
    } finally {
      setSubmitting(false);
    }
  }, [router]);

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="w-8 h-8 mx-auto border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        <p className="mt-4">加载中...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <p className="text-lg mb-4">购物车是空的</p>
        <Link href="/" className="text-blue-600 hover:text-blue-700 font-medium">
          去逛逛
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
      )}

      {/* 购物车列表 */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            {/* 商品图片 */}
            <Link href={`/products/${item.productId}`} className="flex-shrink-0">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
            </Link>

            {/* 商品信息 */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/products/${item.productId}`}
                className="font-medium text-gray-900 truncate hover:text-blue-600"
              >
                {item.name}
              </Link>
              <p className="text-sm text-red-500 mt-1">{formatPrice(item.price)}</p>
            </div>

            {/* 数量控制 */}
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                −
              </button>
              <span className="px-3 py-1 text-sm min-w-[2.5rem] text-center">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                disabled={item.quantity >= item.stock}
                className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                +
              </button>
            </div>

            {/* 小计 + 删除 */}
            <div className="text-right flex-shrink-0">
              <p className="font-medium text-gray-900">{formatPrice(item.subtotal)}</p>
              <button
                onClick={() => removeItem(item.id)}
                className="text-xs text-gray-400 hover:text-red-500 mt-1 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 底部汇总 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            共 {items.reduce((s, i) => s + i.quantity, 0)} 件
          </p>
          <p className="text-2xl font-bold text-red-500">{formatPrice(total)}</p>
        </div>
        <button
          onClick={handleSubmitOrder}
          disabled={submitting}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "提交中..." : "提交订单"}
        </button>
      </div>
    </div>
  );
}
