import { getJson } from "@/services/api/client";
import type { Series } from "@/types";

/**
 * Query parameters accepted by {@link getSeries}. Mirrors the filters and
 * pagination supported by GET /api/series.
 */
export interface GetSeriesParams {
  genre?: string;
  year?: number;
  premium?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Fetch a list of web series with optional filtering and pagination. Unwraps
 * the ApiResponse envelope and returns the series array (empty on failure or
 * when the API returns no data).
 */
export async function getSeries(params?: GetSeriesParams): Promise<Series[]> {
  const query: Record<string, string> = {};
  if (params?.genre) {
    query.genre = params.genre;
  }
  if (typeof params?.year === "number") {
    query.year = String(params.year);
  }
  if (typeof params?.premium === "boolean") {
    query.premium = String(params.premium);
  }
  if (typeof params?.page === "number") {
    query.page = String(params.page);
  }
  if (typeof params?.limit === "number") {
    query.limit = String(params.limit);
  }

  const response = await getJson<Series[]>("/api/series", { params: query });
  return response.success && response.data ? response.data : [];
}

/**
 * Fetch a single series by id. Unwraps the ApiResponse envelope and returns the
 * series, or `null` when it is not found or the request fails.
 */
export async function getSeriesById(id: string): Promise<Series | null> {
  const response = await getJson<Series>(
    `/api/series/${encodeURIComponent(id)}`,
  );
  return response.success && response.data ? response.data : null;
}

/**
 * Search web series by a free-text query. Unwraps the ApiResponse envelope and
 * returns the matching series (empty on failure or when nothing matches).
 */
export async function searchSeries(query: string): Promise<Series[]> {
  const response = await getJson<Series[]>("/api/series/search", {
    params: { q: query },
  });
  return response.success && response.data ? response.data : [];
}
