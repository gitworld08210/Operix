import Rental, { RentalDocument } from "@/models/Rental";
import type { Rental as RentalType, RentalContentType } from "@/types";

import { mapRentalObject, type RawRentalObject } from "./mapRental";
import { connectToDatabase } from "./mongodbService";

/**
 * Fields locating a rentable piece of content. For a movie only `contentType`
 * and `contentId` matter; for an episode the season/episode numbers position it
 * within its series so an episode-specific unlock can be stored and matched.
 */
export interface RentalTarget {
  contentType: RentalContentType;
  /** Stable composite key (see `buildContentId` in lib/playbackAccess). */
  contentId: string;
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
}

/** Default rental window: one hour. */
export const DEFAULT_RENTAL_TTL_MS = 60 * 60 * 1000;

/**
 * Map a Mongoose Rental document to the shared `Rental` type, delegating the
 * pure `_id -> id` / Date -> ISO conversion to {@link mapRentalObject}.
 */
function mapRental(doc: RentalDocument): RentalType {
  const obj = doc.toObject ? doc.toObject() : (doc as any);
  return mapRentalObject(obj as RawRentalObject);
}

/**
 * Create a one-hour (by default) rental unlocking `target` for `userId`.
 * `unlockedAt` is now and `expiresAt` is `now + ttlMs`. Returns the created
 * rental in the shared shape.
 *
 * Note: this is only ever called for NON-premium users — premium viewers are
 * always unlocked without a row (see `isUnlocked`).
 */
export async function createRental(
  userId: string,
  target: RentalTarget,
  ttlMs: number = DEFAULT_RENTAL_TTL_MS,
): Promise<RentalType> {
  await connectToDatabase();

  const unlockedAt = new Date();
  const expiresAt = new Date(unlockedAt.getTime() + ttlMs);

  const doc = await Rental.create({
    userId,
    contentType: target.contentType,
    contentId: target.contentId,
    seriesId: target.seriesId,
    seasonNumber: target.seasonNumber,
    episodeNumber: target.episodeNumber,
    unlockedAt,
    expiresAt,
  });

  return mapRental(doc);
}

/**
 * Fetch the user's currently-active rental for a piece of content, or `null`
 * when none is active. "Active" means `expiresAt > now`, so an expired row is
 * treated as absent. Returns the newest matching rental.
 */
export async function getActiveRental(
  userId: string,
  target: Pick<RentalTarget, "contentType" | "contentId">,
): Promise<RentalType | null> {
  await connectToDatabase();

  const doc = await Rental.findOne({
    userId,
    contentType: target.contentType,
    contentId: target.contentId,
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

  return doc ? mapRental(doc) : null;
}

/**
 * Convenience predicate: whether the user has any active rental for the target.
 * Thin wrapper over {@link getActiveRental} for callers that only need a
 * boolean.
 */
export async function isContentUnlocked(
  userId: string,
  target: Pick<RentalTarget, "contentType" | "contentId">,
): Promise<boolean> {
  const active = await getActiveRental(userId, target);
  return active !== null;
}
