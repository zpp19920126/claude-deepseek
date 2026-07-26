import { MembershipTiers } from "@/lib/constants";

export interface MembershipInfo {
  level: number;
  name: string;
  discountRateBps: number;
  label: string;
}

/**
 * 根据累计消费金额（分）计算心悦等级
 * 从 MembershipTiers 推导，避免硬编码重复
 */
export function getMembershipLevel(totalSpent: number): number {
  let level = 0;
  for (const tier of MembershipTiers) {
    if (totalSpent >= tier.minSpent) {
      level = tier.level;
    }
  }
  return level;
}

/**
 * 获取指定等级的完整信息
 */
export function getMembershipInfo(level: number): MembershipInfo {
  const tier = MembershipTiers.find((t) => t.level === level) ?? MembershipTiers[0];
  return { ...tier };
}

/**
 * 根据等级获取折扣率（基点，10000=100%）
 */
export function getDiscountRateBps(level: number): number {
  return getMembershipInfo(level).discountRateBps;
}

/**
 * 计算折后价格（分），保留整数
 * priceInCents: 原价（分）
 * discountRateBps: 折扣率（基点），如 9800 表示 98%
 */
export function applyDiscount(priceInCents: number, discountRateBps: number): number {
  return Math.round((priceInCents * discountRateBps) / 10000);
}

/**
 * 计算下一个等级还需要消费多少（分）
 */
export function getNextTierProgress(totalSpent: number): {
  nextLevel: number;
  nextLevelName: string;
  remaining: number;
  currentLevel: number;
} | null {
  const currentLevel = getMembershipLevel(totalSpent);

  if (currentLevel >= 3) {
    return {
      nextLevel: -1,
      nextLevelName: "已达最高等级",
      remaining: 0,
      currentLevel,
    };
  }

  const nextLevel = currentLevel + 1;
  const nextTier = MembershipTiers.find((t) => t.level === nextLevel);
  if (!nextTier) return null;

  return {
    nextLevel,
    nextLevelName: nextTier.name,
    remaining: Math.max(0, nextTier.minSpent - totalSpent),
    currentLevel,
  };
}
