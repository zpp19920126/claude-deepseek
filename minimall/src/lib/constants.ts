// 订单状态
export const OrderStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID: "PAID",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];
export const ORDER_STATUS_VALUES = Object.values(OrderStatus) as [string, ...string[]];

// 商品状态
export const ProductStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

// 用户角色
export const Roles = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

// 支付状态
export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

// 心悦会员等级（金额单位为分）
export const MembershipTiers = [
  { level: 0, name: "普通会员", minSpent: 0, discountRateBps: 10000, label: "" },
  { level: 1, name: "心悦1级", minSpent: 800_000, discountRateBps: 9800, label: "心悦1" },
  { level: 2, name: "心悦2级", minSpent: 8_000_000, discountRateBps: 9500, label: "心悦2" },
  { level: 3, name: "心悦3级", minSpent: 80_000_000, discountRateBps: 9000, label: "心悦3" },
] as const;

// 分页默认值
export const DEFAULT_PAGE_SIZE = 9;
export const MAX_PAGE_SIZE = 100;

// 商品图片限制
export const MAX_IMAGES_PER_PRODUCT = 5;
export const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB
