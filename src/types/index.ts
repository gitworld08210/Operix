// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isPremium: boolean;
  premiumExpiry?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Movie Types
export interface Movie {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

// Web Series Types
//
// A Series -> Season -> Episode hierarchy that mirrors the Movie metadata
// fields (title, description, poster, background, genre, year, cast, director,
// premium, rating, ...). Each Episode carries its own video (Azure blob URL +
// blobName), an auto-derived thumbnail, and per-episode metadata.

/** A single playable episode within a season. */
export interface Episode {
  /** Episode number within its season (1-based). */
  episodeNumber: number;
  title: string;
  description?: string;
  /** Azure Blob URL of the episode video (private; served via SAS). */
  videoUrl: string;
  /** Azure blob name/key, used to mint SAS tokens for playback. */
  blobName?: string;
  /** Poster/still for the episode (auto-derived from video or overridden). */
  thumbnail?: string;
  /** Human-readable duration, e.g. "48m". */
  duration?: string;
}

/** A season groups an ordered list of episodes. */
export interface Season {
  /** Season number (1-based). */
  seasonNumber: number;
  title?: string;
  episodes: Episode[];
}

/**
 * A web series. Metadata mirrors {@link Movie} (minus the single `videoUrl`,
 * which lives per-episode) and adds the `seasons` hierarchy.
 */
export interface Series {
  id: string;
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
  seasons: Season[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  title: string;
  icon: string;
}

// Premium Types
export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  period: "monthly" | "yearly";
  features: string[];
  recommended?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
  paymentMethod: string;
}

// Download Types
export interface Download {
  id: string;
  userId: string;
  movieId: string;
  downloadUrl: string;
  quality: "480p" | "720p" | "1080p" | "4K";
  status: "pending" | "downloading" | "completed" | "failed";
  downloadedAt?: string;
  expiresAt?: string;
}

// Ad Types
export interface Ad {
  id: string;
  type: "pre-roll" | "mid-roll" | "post-roll" | "banner";
  videoUrl?: string;
  imageUrl?: string;
  clickUrl?: string;
  duration?: number;
  showingCount: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
