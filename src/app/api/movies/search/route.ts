import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { searchMovies } from "@/services/mongodb/movieRepository";

export const dynamic = "force-dynamic";

/**
 * GET /api/movies/search?q=...
 * Search movies by a free-text query. An empty/missing query yields an empty
 * result set. Returns an ApiResponse<Movie[]>.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const movies = await searchMovies(query);
    return ok(movies);
  } catch {
    return fail("Failed to search movies", 500);
  }
}
