import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(statusCode: number, message: string) {
  return NextResponse.json({ success: false, error: message }, { status: statusCode });
}

export function apiSuccessResponse<T = unknown>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
