import mongoose, { Schema, Document } from "mongoose";

/**
 * Mongoose document shapes for the web-series hierarchy (Series -> Season ->
 * Episode). These mirror the `Series`/`Season`/`Episode` interfaces in
 * src/types/index.ts, minus the fields the repository maps/derives:
 * `id` (from `_id`) and `createdAt`/`updatedAt` (managed by timestamps:true).
 *
 * Seasons and episodes are stored as embedded subdocuments: a series is always
 * loaded and edited as a whole, so keeping the hierarchy in one document avoids
 * cross-collection joins and mirrors the single-document Movie pattern.
 */

/** Embedded episode subdocument. */
export interface EpisodeSubdocument {
  episodeNumber: number;
  title: string;
  description?: string;
  videoUrl: string;
  blobName?: string;
  thumbnail?: string;
  duration?: string;
}

/** Embedded season subdocument. */
export interface SeasonSubdocument {
  seasonNumber: number;
  title?: string;
  episodes: EpisodeSubdocument[];
}

/** Top-level series document shape. */
export interface SeriesDocument extends Document {
  title: string;
  description: string;
  poster: string;
  background: string;
  thumbnail?: string;
  rating: number;
  year: number;
  genre: string;
  genres?: string[];
  cast: string[];
  director: string;
  premium: boolean;
  views: number;
  seasons: SeasonSubdocument[];
  createdAt: Date;
  updatedAt: Date;
}

// `_id: false` on the embedded schemas: episodes/seasons are addressed by their
// number within the parent series, not by their own ObjectId, so we skip the
// auto-generated `_id` to keep the mapped output clean.
const EpisodeSchema = new Schema<EpisodeSubdocument>(
  {
    episodeNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    videoUrl: { type: String, required: true },
    blobName: { type: String },
    thumbnail: { type: String },
    duration: { type: String },
  },
  { _id: false },
);

const SeasonSchema = new Schema<SeasonSubdocument>(
  {
    seasonNumber: { type: Number, required: true },
    title: { type: String },
    episodes: { type: [EpisodeSchema], default: [] },
  },
  { _id: false },
);

const SeriesSchema = new Schema<SeriesDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    poster: { type: String, required: true },
    background: { type: String, required: true },
    thumbnail: { type: String },
    rating: { type: Number, default: 0 },
    year: { type: Number, required: true },
    genre: { type: String, required: true, index: true },
    genres: { type: [String], default: undefined },
    cast: { type: [String], default: [] },
    director: { type: String, required: true },
    premium: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    seasons: { type: [SeasonSchema], default: [] },
  },
  { timestamps: true },
);

// Hot-reload guard: reuse an already-compiled model in dev so repeated module
// reloads do not throw "Cannot overwrite model once compiled" (same pattern as
// the Movie model).
const Series =
  (mongoose.models.Series as mongoose.Model<SeriesDocument>) ||
  mongoose.model<SeriesDocument>("Series", SeriesSchema);

export default Series;
