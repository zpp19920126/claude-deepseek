"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PickerItem {
  id: number;
  name: string;
  // 允许 API 返回的其他字段（如 orderNo / customerName）透传给调用方
  [key: string]: unknown;
}

interface EntityPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: PickerItem) => void;
  title: string;
  apiUrl: string;
  /**
   * 主显示字段名，默认 "name"。
   * 向后兼容：未传时使用 "name"，原有调用方（分类/供应商/客户等 API 返回 {id,name}）无需改动。
   * 当 API 返回的列表项不含 name 字段时（如配送单返回 orderNo），需通过此 prop 指定。
   */
  labelField?: string;
  /**
   * 辅助显示字段名（可选）。设置后，每行会在主字段后附加显示次字段值。
   * 例如配送单选择器可设为 "customerName"，行内显示 "DO20260804-001（张三蔬菜店）"。
   */
  secondaryField?: string;
}

/**
 * 通用实体选择器弹窗
 * 用于从分类/供应商/客户等数据库中搜索并选择一条记录。
 *
 * 默认渲染 item.name；如调用方 API 返回的列表项不含 name，可通过 labelField
 * 指定主显示字段（如配送单的 "orderNo"），并可选 secondaryField 指定次字段
 * （如 "customerName"）。onSelect 回调会收到完整的原始 item 对象，调用方
 * 可直接访问所需字段。
 */
export function EntityPicker({
  open,
  onClose,
  onSelect,
  title,
  apiUrl,
  labelField = "name",
  secondaryField,
}: EntityPickerProps) {
  const [items, setItems] = useState<PickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = search
        ? `${apiUrl}?search=${encodeURIComponent(search)}`
        : apiUrl;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        // 兼容分页响应和普通响应
        const data = json.data?.items || json.data || [];
        setItems(data as PickerItem[]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, search]);

  useEffect(() => {
    if (open) {
      setSearch("");
      fetchData();
    }
  }, [open, fetchData]);

  function handleSelect(item: PickerItem) {
    // 传递完整原始 item，调用方可访问 id/name 及 API 返回的其他字段
    onSelect(item);
    onClose();
  }

  function getField(item: PickerItem, field?: string): string {
    if (!field) return "";
    const v = item[field];
    return v == null ? "" : String(v);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <Button variant="secondary" onClick={onClose}>
          关闭
        </Button>
      }
    >
      <div className="space-y-3">
        <Input
          placeholder="输入名称搜索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") fetchData();
          }}
        />
        <Button size="sm" onClick={fetchData} loading={loading}>
          搜索
        </Button>

        <div className="max-h-64 overflow-y-auto scrollbar-thin border border-border rounded-lg">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              加载中...
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-text-muted">
              暂无数据
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => {
                const label = getField(item, labelField);
                const secondary = getField(item, secondaryField);
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSelect(item)}
                      className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-bg transition-colors"
                    >
                      <span>{label}</span>
                      {secondary && (
                        <span className="ml-2 text-text-muted">
                          （{secondary}）
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
