import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

import type { ApiResponse } from "@/types";

/**
 * Base URL for the API client.
 *
 * Prefer NEXT_PUBLIC_APP_URL when configured (e.g. server-side rendering where
 * a relative URL has no origin to resolve against), otherwise fall back to an
 * empty string so requests target the same-origin `/api/*` route handlers
 * served by Next.js itself.
 */
const baseURL = process.env.NEXT_PUBLIC_APP_URL || "";

/**
 * Shared axios instance used by all client-side API wrappers. It is created
 * once at module scope and performs no network activity at import time.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Normalize any thrown error into the {@link ApiResponse} failure envelope so
 * callers can uniformly handle success and error states without inspecting
 * axios-specific shapes.
 *
 * If the server already responded with an {@link ApiResponse} body (our route
 * handlers always do), that body is returned as-is. Otherwise a synthetic
 * failure envelope is built from the error message.
 */
export function normalizeError<T>(error: unknown): ApiResponse<T> {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<T> | undefined;
    if (data && typeof data === "object" && "success" in data) {
      return data;
    }
    const message = error.message || "Request failed";
    return { success: false, message, error: message };
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  return { success: false, message, error: message };
}

/**
 * Perform a GET request and return the parsed {@link ApiResponse} envelope,
 * converting any failure (network error, non-2xx status) into the failure
 * envelope via {@link normalizeError}. Never throws.
 */
export async function getJson<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<ApiResponse<T>> {
  try {
    const response: AxiosResponse<ApiResponse<T>> = await apiClient.get(
      url,
      config,
    );
    return response.data;
  } catch (error) {
    return normalizeError<T>(error);
  }
}

export default apiClient;
