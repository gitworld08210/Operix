import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { ok, fail } from "@/lib/apiResponse";
import { updateSeriesSchema } from "@/lib/validation";
import {
  deleteSeries,
  incrementSeriesViews,
  updateSeries,
} from "@/services/mongodb/seriesRepository";

export const dynamic = "force-dynamic";

/** Context argument carrying the dynamic `[id]` route segment. */
interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/series/:id
 * Fetch a single series. Counts as a view (atomic increment). Responds with
 * 404 when no series matches the id.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const series = await incrementSeriesViews(params.id);
    if (!series) {
      return fail("Series not found", 404);
    }
    return ok(series);
  } catch {
    return fail("Failed to fetch series", 500);
  }
}

/**
 * PUT /api/series/:id
 * Validate the request body against the update schema and apply the patch.
 * Admin-gated. Responds with 404 when no series matches the id.
 */
export async function PUT(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdmin(request)) {
    return fail("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = updateSeriesSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid series payload", 400);
  }

  try {
    const series = await updateSeries(params.id, parsed.data);
    if (!series) {
      return fail("Series not found", 404);
    }
    return ok(series);
  } catch {
    return fail("Failed to update series", 500);
  }
}

/**
 * DELETE /api/series/:id
 * Remove a series. Admin-gated. Responds with 404 when no series matched.
 */
export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAuthorizedAdmin(request)) {
    return fail("Unauthorized", 401);
  }

  try {
    const deleted = await deleteSeries(params.id);
    if (!deleted) {
      return fail("Series not found", 404);
    }
    return ok({ id: params.id });
  } catch {
    return fail("Failed to delete series", 500);
  }
}
