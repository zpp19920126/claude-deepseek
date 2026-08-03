// 业务错误：在事务内抛出，由路由层统一转为 { success: false, error } 响应
export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
