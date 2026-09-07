import { z } from "zod";

/**
 * Validation schemas for the movie API route handlers. These mirror the
 * `Movie` type in src/types/index.ts (minus the server-managed fields
 * `id`, `createdAt`, `updatedAt`) and match the `CreateMovieInput` /
 * `UpdateMovieInput` shapes accepted by the movie repository.
 */

/**
 * Schema for creating a movie. Required fields mirror the non-optional
 * properties of the `Movie` type; `views` and `downloadCount` are optional
 * because the repository/model default them.
 */
/**
 * Earliest plausible film year (Roundhay Garden Scene, 1888). The upper bound
 * allows a small window past the current year for announced/pre-release titles.
 */
const MIN_MOVIE_YEAR = 1888;
const MAX_MOVIE_YEAR = new Date().getFullYear() + 5;

export const createMovieSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  poster: z.string().url(),
  background: z.string().url(),
  thumbnail: z.string().url().optional(),
  videoUrl: z.string().url(),
  videoThumbnail: z.string().url().optional(),
  rating: z.number().min(0).max(10),
  year: z.number().int().min(MIN_MOVIE_YEAR).max(MAX_MOVIE_YEAR),
  duration: z.string().min(1),
  genre: z.string().min(1),
  genres: z.array(z.string()).optional(),
  cast: z.array(z.string()),
  director: z.string().min(1),
  premium: z.boolean(),
  views: z.number().optional(),
  downloadCount: z.number().optional(),
});

/** Payload accepted when creating a movie. */
export type CreateMoviePayload = z.infer<typeof createMovieSchema>;

/**
 * Schema for updating a movie. Every field is optional so callers can send a
 * partial patch.
 */
export const updateMovieSchema = createMovieSchema.partial();

/** Payload accepted when updating a movie. */
export type UpdateMoviePayload = z.infer<typeof updateMovieSchema>;

/**
 * Parser for the list endpoint's query parameters. Query strings arrive as
 * strings, so numeric and boolean values are coerced. All filters are
 * optional. `premium` accepts the literal strings "true"/"false".
 */
export const listMoviesQuerySchema = z.object({
  genre: z.string().min(1).optional(),
  year: z.coerce.number().int().optional(),
  premium: z
    .enum(["true", "false"])
    .transform((value: "true" | "false") => value === "true")
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

/** Parsed list query parameters. */
export type ListMoviesQuery = z.infer<typeof listMoviesQuerySchema>;
