// Order status
export const OrderStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAID: "PAID",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

// Product status
export const ProductStatus = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
} as const;

// User roles
export const Roles = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

// Payment status
export const PaymentStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

// Membership tiers (心悦等级)
export const MembershipTiers = [
  { level: 0, name: "普通会员", minSpent: 0, discountRate: 1.0, label: "" },
  { level: 1, name: "心悦1级", minSpent: 8_000, discountRate: 0.98, label: "心悦1" },
  { level: 2, name: "心悦2级", minSpent: 80_000, discountRate: 0.95, label: "心悦2" },
  { level: 3, name: "心悦3级", minSpent: 800_000, discountRate: 0.90, label: "心悦3" },
] as const;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 100;

// Product image limits
export const MAX_IMAGES_PER_PRODUCT = 5;
export const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB
