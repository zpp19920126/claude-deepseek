export interface CartItemData {
  id?: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

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
