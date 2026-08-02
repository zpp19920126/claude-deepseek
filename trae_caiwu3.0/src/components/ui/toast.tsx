"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

// ==================== Toast Store ====================
let toasts: ToastItem[] = [];
let listeners: Set<(toasts: ToastItem[]) => void> = new Set();
let nextId = 1;

function notify() {
  listeners.forEach((listener) => listener([...toasts]));
}

function addToast(type: ToastType, message: string, duration = 3000) {
  const id = nextId++;
  toasts = [...toasts, { id, type, message }];
  notify();

  setTimeout(() => {
    removeToast(id);
  }, duration);
}

function removeToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

// ==================== Toast API ====================
export const toast = {
  success: (message: string, duration?: number) => addToast("success", message, duration),
  error: (message: string, duration?: number) => addToast("error", message, duration ?? 5000),
  info: (message: string, duration?: number) => addToast("info", message, duration),
  warning: (message: string, duration?: number) => addToast("warning", message, duration),
};

// ==================== Toast Container ====================
const typeConfig: Record<ToastType, { icon: string; className: string }> = {
  success: { icon: "✓", className: "bg-primary text-white" },
  error: { icon: "✕", className: "bg-danger text-white" },
  info: { icon: "ℹ", className: "bg-info text-white" },
  warning: { icon: "⚠", className: "bg-warning text-white" },
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastItem[]) => setItems(newToasts);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const handleRemove = useCallback((id: number) => removeToast(id), []);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map((item) => {
        const config = typeConfig[item.type];
        return (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right",
              config.className
            )}
          >
            <span className="text-lg font-bold shrink-0">{config.icon}</span>
            <p className="text-sm flex-1">{item.message}</p>
            <button
              onClick={() => handleRemove(item.id)}
              className="opacity-70 hover:opacity-100 shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
