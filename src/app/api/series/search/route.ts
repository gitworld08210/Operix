import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { searchSeries } from "@/services/mongodb/seriesRepository";

export const dynamic = "force-dynamic";

/**
 * GET /api/series/search?q=...
 * Search web series by a free-text query. An empty/missing query yields an
 * empty result set. Returns an ApiResponse<Series[]>. Mirrors the movie search.
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  try {
    const series = await searchSeries(query);
    return ok(series);
  } catch {
    return fail("Failed to search series", 500);
  }
}
