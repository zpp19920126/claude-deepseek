"use client";

import { useState } from "react";

type AddToCartButtonProps = {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string | null;
  disabled: boolean;
};

/**
 * 加入购物车按钮（客户端组件）
 * 已登录用户调用 API，未登录用户存 localStorage
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

  const handleAdd = () => {
    // 暂时使用 localStorage 方案（认证系统完成后改为双后端）
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
    <div className="flex items-center gap-4">
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
  );
}
