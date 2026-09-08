import type { Movie as MovieType } from "@/types";

/**
 * A plain-object view of a persisted movie, i.e. the result of calling
 * `.toObject()` on a Mongoose Movie document (or an equivalent lean object).
 * Kept dependency-free (no mongoose import) so the pure mapping below can be
 * unit-tested offline without the uninstallable driver.
 */
export interface RawMovieObject {
  _id: unknown;
  title: string;
  description: string;
  poster: string;
  background: string;
  thumbnail?: string;
  videoUrl: string;
  videoThumbnail?: string;
  rating: number;
  year: number;
  duration: string;
  genre: string;
  genres?: string[];
  cast?: string[];
  director: string;
  premium: boolean;
  views: number;
  downloadCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Pure mapping from a persisted movie object to the shared `Movie` type:
 * converts `_id` to a string `id`, defaults a missing `cast` to `[]`, and
 * serialises Date timestamps to ISO strings (passing through string values).
 *
 * This is intentionally free of any mongoose dependency so it can be exercised
 * by offline unit tests (see mapMovie.test.ts). The repository's document
 * mapper delegates here after calling `.toObject()`.
 */
export function mapMovieObject(obj: RawMovieObject): MovieType {
  return {
    id: String(obj._id),
    title: obj.title,
    description: obj.description,
    poster: obj.poster,
    background: obj.background,
    thumbnail: obj.thumbnail,
    videoUrl: obj.videoUrl,
    videoThumbnail: obj.videoThumbnail,
    rating: obj.rating,
    year: obj.year,
    duration: obj.duration,
    genre: obj.genre,
    genres: obj.genres,
    cast: obj.cast ?? [],
    director: obj.director,
    premium: obj.premium,
    views: obj.views,
    downloadCount: obj.downloadCount,
    createdAt:
      obj.createdAt instanceof Date
        ? obj.createdAt.toISOString()
        : obj.createdAt,
    updatedAt:
      obj.updatedAt instanceof Date
        ? obj.updatedAt.toISOString()
        : obj.updatedAt,
  };
}
