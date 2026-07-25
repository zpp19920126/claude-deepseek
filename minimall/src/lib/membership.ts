import { MembershipTiers } from "@/lib/constants";

export interface MembershipInfo {
  level: number;
  name: string;
  discountRate: number;
  label: string;
}

/**
 * 根据累计消费金额计算心悦等级
 */
export function getMembershipLevel(totalSpent: number): number {
  if (totalSpent >= 800_000) return 3;
  if (totalSpent >= 80_000) return 2;
  if (totalSpent >= 8_000) return 1;
  return 0;
}

/**
 * 获取指定等级的完整信息
 */
export function getMembershipInfo(level: number): MembershipInfo {
  const tier = MembershipTiers[level] ?? MembershipTiers[0];
  return { ...tier };
}

/**
 * 根据等级获取折扣率
 */
export function getDiscountRate(level: number): number {
  return getMembershipInfo(level).discountRate;
}

/**
 * 计算折后价格（保留两位小数）
 */
export function applyDiscount(price: number, discountRate: number): number {
  return Math.round(price * discountRate * 100) / 100;
}

/**
 * 计算下一个等级还需要消费多少
 */
export function getNextTierProgress(totalSpent: number): {
  nextLevel: number;
  nextLevelName: string;
  remaining: number;
  currentLevel: number;
} | null {
  const currentLevel = getMembershipLevel(totalSpent);

  if (currentLevel >= 3) {
    // 已是最高等级
    return {
      nextLevel: -1,
      nextLevelName: "已达最高等级",
      remaining: 0,
      currentLevel,
    };
  }

  const nextLevel = currentLevel + 1;
  const nextTier = MembershipTiers[nextLevel];
  const remaining = nextTier.minSpent - totalSpent;

  return {
    nextLevel,
    nextLevelName: nextTier.name,
    remaining: Math.max(0, remaining),
    currentLevel,
  };
}
