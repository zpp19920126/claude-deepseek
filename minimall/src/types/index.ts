// ========== 购物车 ==========

export interface CartItemData {
  id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

// ========== API 响应 ==========

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ========== 认证 ==========

export interface SessionPayload {
  userId: string;
  role: string;
}
