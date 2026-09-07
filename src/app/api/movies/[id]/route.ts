import { ok, fail } from "@/lib/apiResponse";
import { updateMovieSchema } from "@/lib/validation";
import {
  deleteMovie,
  getMovieById,
  updateMovie,
} from "@/services/mongodb/movieRepository";

export const dynamic = "force-dynamic";

/** Context argument carrying the dynamic `[id]` route segment. */
interface RouteContext {
  params: { id: string };
}

/**
 * GET /api/movies/:id
 * Fetch a single movie. Responds with 404 when no movie matches the id.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const movie = await getMovieById(params.id);
    if (!movie) {
      return fail("Movie not found", 404);
    }
    return ok(movie);
  } catch {
    return fail("Failed to fetch movie", 500);
  }
}

/**
 * PUT /api/movies/:id
 * Validate the request body against the update schema and apply the patch.
 * Responds with 404 when no movie matches the id.
 */
export async function PUT(request: Request, { params }: RouteContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = updateMovieSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid movie payload", 400);
  }

  try {
    const movie = await updateMovie(params.id, parsed.data);
    if (!movie) {
      return fail("Movie not found", 404);
    }
    return ok(movie);
  } catch {
    return fail("Failed to update movie", 500);
  }
}

/**
 * DELETE /api/movies/:id
 * Remove a movie. Responds with 404 when no movie matched the id.
 */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const deleted = await deleteMovie(params.id);
    if (!deleted) {
      return fail("Movie not found", 404);
    }
    return ok({ id: params.id });
  } catch {
    return fail("Failed to delete movie", 500);
  }
}
