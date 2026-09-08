import type { Rental as RentalType, RentalContentType } from "@/types";

/**
 * A plain-object view of a persisted rental, i.e. the result of calling
 * `.toObject()` on a Mongoose Rental document (or an equivalent lean object).
 * Kept dependency-free (no mongoose import) so the pure mapping below can be
 * unit-tested offline without the uninstallable driver.
 */
export interface RawRentalObject {
  _id: unknown;
  userId: unknown;
  contentType: string;
  contentId: string;
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  unlockedAt: Date | string;
  expiresAt: Date | string;
  createdAt: Date | string;
}

/** Serialise a Date to ISO; pass strings through unchanged. */
function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Narrow an arbitrary stored contentType to a known {@link RentalContentType},
 * defaulting to `"movie"`. (Only `"movie"` and `"episode"` are ever written by
 * the repository; the default keeps the mapper total.)
 */
function toContentType(value: string): RentalContentType {
  return value === "episode" ? "episode" : "movie";
}

/**
 * Pure mapping from a persisted rental object to the shared `Rental` type:
 * converts `_id`/`userId` to strings, normalises the content type, and
 * serialises Date timestamps to ISO strings. Free of any mongoose dependency so
 * it can be exercised by offline unit tests (see mapRental.test.ts).
 */
export function mapRentalObject(obj: RawRentalObject): RentalType {
  return {
    id: String(obj._id),
    userId: String(obj.userId),
    contentType: toContentType(obj.contentType),
    contentId: obj.contentId,
    seriesId: obj.seriesId,
    seasonNumber: obj.seasonNumber,
    episodeNumber: obj.episodeNumber,
    unlockedAt: toIso(obj.unlockedAt),
    expiresAt: toIso(obj.expiresAt),
    createdAt: toIso(obj.createdAt),
  };
}
