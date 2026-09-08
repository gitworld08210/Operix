import mongoose, { Schema, Document } from "mongoose";

/**
 * Mongoose document shape for a rental (time-limited unlock). Mirrors the
 * `Rental` interface in src/types/index.ts, minus `id` (mapped from `_id`) and
 * `createdAt` (managed by timestamps:true).
 *
 * A rental grants a single user read access to a single movie or episode for a
 * bounded window: `expiresAt = unlockedAt + ttl`. Playback authorisation checks
 * `expiresAt > now`; an expired row simply stops granting access. Premium users
 * are always unlocked WITHOUT a rental row, so this collection only ever holds
 * per-title unlocks bought by non-premium users.
 */
export interface RentalDocument extends Document {
  userId: string;
  contentType: "movie" | "episode";
  contentId: string;
  seriesId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  unlockedAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RentalSchema = new Schema<RentalDocument>(
  {
    // Indexed together with contentType/contentId so the "active rental for
    // this user and title" lookup is a single index hit.
    userId: { type: String, required: true, index: true },
    contentType: {
      type: String,
      enum: ["movie", "episode"],
      required: true,
    },
    contentId: { type: String, required: true },
    seriesId: { type: String },
    seasonNumber: { type: Number },
    episodeNumber: { type: Number },
    unlockedAt: { type: Date, required: true },
    // A TTL index lets MongoDB reap expired rentals automatically, so the
    // collection does not grow unbounded. The application still verifies
    // `expiresAt > now` itself and never relies on the reaper for correctness
    // (the background deleter runs only about once a minute).
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

// Compound index backing getActiveRental / isContentUnlocked: match a user's
// unlock of a specific title, newest first.
RentalSchema.index({ userId: 1, contentType: 1, contentId: 1, expiresAt: -1 });

// Hot-reload guard: reuse an already-compiled model in dev so repeated module
// reloads do not throw "Cannot overwrite model once compiled" (same pattern as
// the Movie/Series/User models).
const Rental =
  (mongoose.models.Rental as mongoose.Model<RentalDocument>) ||
  mongoose.model<RentalDocument>("Rental", RentalSchema);

export default Rental;
