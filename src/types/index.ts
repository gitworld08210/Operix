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
