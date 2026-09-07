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


/**
 * Validation schemas for the web-series hierarchy (Series -> Season -> Episode)
 * and for the upload / bulk-create endpoints. These mirror the
 * `Series`/`Season`/`Episode` types in src/types/index.ts (minus the
 * server-managed fields `id`, `createdAt`, `updatedAt`) and the repository's
 * `CreateSeriesInput` shape.
 */

/** Schema for a single episode within a season. */
export const episodeSchema = z.object({
  episodeNumber: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  videoUrl: z.string().url(),
  blobName: z.string().optional(),
  thumbnail: z.string().url().optional(),
  duration: z.string().optional(),
});

/** Schema for a season and its episodes. */
export const seasonSchema = z.object({
  seasonNumber: z.number().int().positive(),
  title: z.string().optional(),
  episodes: z.array(episodeSchema).default([]),
});

/**
 * Schema for creating a series. Required fields mirror the non-optional
 * properties of the `Series` type; `views` is optional because the model
 * defaults it, and `seasons` defaults to an empty array (episodes can be added
 * later via the episode-upload endpoint).
 */
export const createSeriesSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  poster: z.string().url(),
  background: z.string().url(),
  thumbnail: z.string().url().optional(),
  rating: z.number().min(0).max(10),
  year: z.number().int().min(MIN_MOVIE_YEAR).max(MAX_MOVIE_YEAR),
  genre: z.string().min(1),
  genres: z.array(z.string()).optional(),
  cast: z.array(z.string()),
  director: z.string().min(1),
  premium: z.boolean(),
  views: z.number().optional(),
  seasons: z.array(seasonSchema).optional(),
});

/** Payload accepted when creating a series. */
export type CreateSeriesPayload = z.infer<typeof createSeriesSchema>;

/** Schema for updating a series (partial patch). */
export const updateSeriesSchema = createSeriesSchema.partial();

/** Payload accepted when updating a series. */
export type UpdateSeriesPayload = z.infer<typeof updateSeriesSchema>;

/** Parser for the series list endpoint's query parameters. */
export const listSeriesQuerySchema = listMoviesQuerySchema;

/** Parsed series list query parameters. */
export type ListSeriesQuery = z.infer<typeof listSeriesQuerySchema>;

/**
 * Metadata accepted alongside a MOVIE video upload (multipart/form-data). The
 * video file itself is read from the form data separately; these are the text
 * fields describing it. `poster`/`background` are optional here because the
 * upload route can auto-derive a thumbnail from the video (Cloudinary) when a
 * custom poster is not supplied. Numeric/boolean values arrive as form strings
 * so they are coerced.
 */
export const uploadMovieMetadataSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  year: z.coerce.number().int().min(MIN_MOVIE_YEAR).max(MAX_MOVIE_YEAR),
  duration: z.string().min(1),
  genre: z.string().min(1),
  genres: z.array(z.string()).optional(),
  cast: z.array(z.string()).optional(),
  director: z.string().min(1),
  premium: z.coerce.boolean().optional(),
  rating: z.coerce.number().min(0).max(10).optional(),
  // Optional custom overrides. When absent, poster/thumbnail are auto-derived.
  poster: z.string().url().optional(),
  background: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
});

/** Parsed movie-upload metadata. */
export type UploadMovieMetadata = z.infer<typeof uploadMovieMetadataSchema>;

/**
 * Metadata accepted alongside an EPISODE video upload (multipart/form-data).
 * The `seriesId` and season/episode identifiers position the uploaded episode
 * within an existing series.
 */
export const uploadEpisodeMetadataSchema = z.object({
  seriesId: z.string().min(1),
  seasonNumber: z.coerce.number().int().positive(),
  seasonTitle: z.string().optional(),
  episodeNumber: z.coerce.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  duration: z.string().optional(),
  thumbnail: z.string().url().optional(),
});

/** Parsed episode-upload metadata. */
export type UploadEpisodeMetadata = z.infer<typeof uploadEpisodeMetadataSchema>;

/**
 * A single row of a BULK movie-create request. This is the JSON-array shape and
 * also the target shape after CSV parsing + coercion. Every movie field must be
 * present (bulk callers already have full metadata rows, including hosted video
 * URLs), so the required set matches {@link createMovieSchema}. Array-valued
 * fields (`cast`, `genres`) may arrive either as real arrays (JSON) or as
 * pipe/comma-delimited strings (CSV); a preprocessing transform normalises
 * them.
 */
const delimitedToArray = z.preprocess((value: unknown) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split(/[|,]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }
  return value;
}, z.array(z.string()));

export const bulkMovieRowSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  poster: z.string().url(),
  background: z.string().url(),
  thumbnail: z.string().url().optional(),
  videoUrl: z.string().url(),
  videoThumbnail: z.string().url().optional(),
  rating: z.coerce.number().min(0).max(10),
  year: z.coerce.number().int().min(MIN_MOVIE_YEAR).max(MAX_MOVIE_YEAR),
  duration: z.string().min(1),
  genre: z.string().min(1),
  genres: delimitedToArray.optional(),
  cast: delimitedToArray.default([]),
  director: z.string().min(1),
  premium: z.coerce.boolean().default(false),
});

/** A validated bulk movie row. */
export type BulkMovieRow = z.infer<typeof bulkMovieRowSchema>;

/** The JSON body accepted by the bulk-create endpoint: `{ items: [...] }`. */
export const bulkMoviesSchema = z.object({
  items: z.array(bulkMovieRowSchema).min(1),
});

/** Parsed bulk-create payload. */
export type BulkMoviesPayload = z.infer<typeof bulkMoviesSchema>;
