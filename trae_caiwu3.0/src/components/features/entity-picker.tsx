"use client";

import { useState, useEffect, useCallback } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PickerItem {
  id: number;
  name: string;
}

interface EntityPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: { id: number; name: string }) => void;
  title: string;
  apiUrl: string;
}

/**
 * 通用实体选择器弹窗
 * 用于从分类/供应商数据库中搜索并选择一条记录
 */
export function EntityPicker({
  open,
  onClose,
  onSelect,
  title,
  apiUrl,
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
        setItems(data);
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
    onSelect({ id: item.id, name: item.name });
    onClose();
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
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => handleSelect(item)}
                    className="w-full text-left px-4 py-2.5 text-sm text-text hover:bg-bg transition-colors"
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
