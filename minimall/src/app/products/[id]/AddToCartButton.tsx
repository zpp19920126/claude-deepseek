"use client";

import { useState } from "react";
import { getCsrfToken } from "@/lib/client-utils";

type AddToCartButtonProps = {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string | null;
  disabled: boolean;
};
/**
 * 加入购物车按钮（客户端组件）
 * 优先调用 API，401 时回退 localStorage
 */
export function AddToCartButton({
  productId,
  productName,
  productPrice,
  productImage,
  disabled,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    setError("");
    setAdded(false);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": getCsrfToken(),
        },
        body: JSON.stringify({ productId, quantity }),
      });

      const data = await res.json();

      if (data.success) {
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
        return;
      }

      // 401 → 未登录，回退 localStorage
      if (res.status === 401) {
        addToLocalStorage();
        return;
      }

      setError(data.error || "操作失败");
    } catch {
      // 网络异常，尝试 localStorage
      addToLocalStorage();
    }
  };

  const addToLocalStorage = () => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find(
      (item: { productId: string }) => item.productId === productId
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        productId,
        name: productName,
        price: productPrice,
        image: productImage,
        quantity,
      });
    }

    localStorage.setItem("cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cartUpdated"));

    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div>
      {error && (
        <p className="text-sm text-red-500 mb-3">{error}</p>
      )}
      <div className="flex items-center gap-4">
        {/* 数量选择 */}
        <div className="flex items-center border border-gray-300 rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
            disabled={disabled}
          >
            −
          </button>
          <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(Math.min(99, quantity + 1))}
            className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
            disabled={disabled}
          >
            +
          </button>
        </div>

        {/* 加购按钮 */}
        <button
          onClick={handleAdd}
          disabled={disabled}
          className={`flex-1 py-3 px-6 rounded-lg font-medium text-sm transition-all ${
            added
              ? "bg-green-500 text-white"
              : disabled
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
          }`}
        >
          {added ? "✓ 已加入购物车" : disabled ? "暂时缺货" : "加入购物车"}
        </button>
      </div>
    </div>
  );
}
