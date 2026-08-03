// 统一 API 响应类型
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
};

// 分页查询参数
export type PaginationParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

// 分页响应类型
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// 订单状态枚举
export const SALES_ORDER_STATUS = {
  pending: "待确认",
  confirmed: "已确认",
  delivered: "已配送",
  paid: "已收款",
  cancelled: "已取消",
} as const;

export const PURCHASE_ORDER_STATUS = {
  pending: "待收货",
  received: "已入库",
  cancelled: "已取消",
} as const;

// 用户角色
export const USER_ROLES = {
  admin: "管理员",
  user: "操作员",
} as const;

// 用户状态
export const USER_STATUS = {
  active: "启用",
  inactive: "停用",
} as const;

// 商品状态
export const PRODUCT_STATUS = {
  active: "在售",
  inactive: "停售",
} as const;
