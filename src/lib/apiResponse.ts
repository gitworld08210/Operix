import { NextResponse } from "next/server";

import type { ApiResponse, Pagination } from "@/types";

/**
 * Build a successful {@link ApiResponse} JSON response.
 *
 * @param data - The payload to return under `data`.
 * @param pagination - Optional pagination metadata for list responses.
 * @param status - HTTP status code (defaults to 200).
 */
export function ok<T>(
  data: T,
  pagination?: Pagination,
  status = 200,
): NextResponse<ApiResponse<T>> {
  const body: ApiResponse<T> = { success: true, data };
  if (pagination) {
    body.pagination = pagination;
  }
  return NextResponse.json(body, { status });
}

/**
 * Build a failure {@link ApiResponse} JSON response with the given status.
 *
 * @param message - Human-readable error message (also surfaced as `error`).
 * @param status - HTTP status code (defaults to 500).
 */
export function fail(
  message: string,
  status = 500,
): NextResponse<ApiResponse<never>> {
  const body: ApiResponse<never> = {
    success: false,
    message,
    error: message,
  };
  return NextResponse.json(body, { status });
}
