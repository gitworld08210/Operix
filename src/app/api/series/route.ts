import type { NextRequest } from "next/server";

import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { ok, fail } from "@/lib/apiResponse";
import { createSeriesSchema, listSeriesQuerySchema } from "@/lib/validation";
import { createSeries, listSeries } from "@/services/mongodb/seriesRepository";
import type { Pagination } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/series
 * List web series with optional filtering (genre, year, premium) and
 * pagination (page, limit). Returns an ApiResponse<Series[]> with pagination
 * metadata. Mirrors GET /api/movies.
 */
export async function GET(request: NextRequest) {
  const parsed = listSeriesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return fail("Invalid query parameters", 400);
  }

  try {
    const { series, total } = await listSeries(parsed.data);

    const page = parsed.data.page ?? 1;
    const limit = parsed.data.limit ?? 20;
    const pagination: Pagination = {
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };

    return ok(series, pagination);
  } catch {
    return fail("Failed to list series", 500);
  }
}

/**
 * POST /api/series
 * Create a web series (metadata + optional embedded seasons/episodes). Episodes
 * with hosted video URLs can be included directly, or added later via
 * POST /api/upload/episode. Admin-gated (fails closed with 401).
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return fail("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = createSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid series payload", 400);
  }

  try {
    const series = await createSeries(parsed.data);
    return ok(series, undefined, 201);
  } catch {
    return fail("Failed to create series", 500);
  }
}
