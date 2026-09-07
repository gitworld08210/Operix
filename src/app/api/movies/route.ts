import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { createMovieSchema, listMoviesQuerySchema } from "@/lib/validation";
import {
  createMovie,
  listMovies,
} from "@/services/mongodb/movieRepository";
import type { Pagination } from "@/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/movies
 * List movies with optional filtering (genre, year, premium) and pagination
 * (page, limit). Returns an ApiResponse<Movie[]> with pagination metadata.
 */
export async function GET(request: NextRequest) {
  const parsed = listMoviesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return fail("Invalid query parameters", 400);
  }

  try {
    const { movies, total } = await listMovies(parsed.data);

    const page = parsed.data.page ?? 1;
    const limit = parsed.data.limit ?? 20;
    const pagination: Pagination = {
      page,
      limit,
      total,
      totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    };

    return ok(movies, pagination);
  } catch {
    return fail("Failed to list movies", 500);
  }
}

/**
 * POST /api/movies
 * Validate the request body against the create schema and persist a new movie.
 * Returns the created movie with a 201 status.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = createMovieSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid movie payload", 400);
  }

  try {
    const movie = await createMovie(parsed.data);
    return ok(movie, undefined, 201);
  } catch {
    return fail("Failed to create movie", 500);
  }
}
