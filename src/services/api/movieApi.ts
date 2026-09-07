import { getJson } from "@/services/api/client";
import type { Movie } from "@/types";

/**
 * Query parameters accepted by {@link getMovies}. Mirrors the filters and
 * pagination supported by GET /api/movies.
 */
export interface GetMoviesParams {
  genre?: string;
  year?: number;
  premium?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Fetch a list of movies with optional filtering and pagination.
 * Unwraps the ApiResponse envelope and returns the movie array (empty on
 * failure or when the API returns no data).
 */
export async function getMovies(params?: GetMoviesParams): Promise<Movie[]> {
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

  const response = await getJson<Movie[]>("/api/movies", { params: query });
  return response.success && response.data ? response.data : [];
}

/**
 * Fetch a single movie by id. Unwraps the ApiResponse envelope and returns the
 * movie, or `null` when it is not found or the request fails.
 */
export async function getMovieById(id: string): Promise<Movie | null> {
  const response = await getJson<Movie>(`/api/movies/${encodeURIComponent(id)}`);
  return response.success && response.data ? response.data : null;
}

/**
 * Search movies by a free-text query. Unwraps the ApiResponse envelope and
 * returns the matching movies (empty on failure or when nothing matches).
 */
export async function searchMovies(query: string): Promise<Movie[]> {
  const response = await getJson<Movie[]>("/api/movies/search", {
    params: { q: query },
  });
  return response.success && response.data ? response.data : [];
}
