import mongoose, { Schema, Document } from "mongoose";

/**
 * Mongoose document shape for a movie. Mirrors the `Movie` interface in
 * src/types/index.ts, minus the fields the repository maps/derives:
 * `id` (from `_id`) and `createdAt`/`updatedAt` (managed by timestamps:true).
 */
export interface MovieDocument extends Document {
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
  cast: string[];
  director: string;
  premium: boolean;
  views: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MovieSchema = new Schema<MovieDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    poster: { type: String, required: true },
    background: { type: String, required: true },
    thumbnail: { type: String },
    videoUrl: { type: String, required: true },
    videoThumbnail: { type: String },
    rating: { type: Number, default: 0 },
    year: { type: Number, required: true },
    duration: { type: String, required: true },
    genre: { type: String, required: true, index: true },
    genres: { type: [String], default: undefined },
    cast: { type: [String], default: [] },
    director: { type: String, required: true },
    premium: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Movie =
  (mongoose.models.Movie as mongoose.Model<MovieDocument>) ||
  mongoose.model<MovieDocument>("Movie", MovieSchema);

export default Movie;
