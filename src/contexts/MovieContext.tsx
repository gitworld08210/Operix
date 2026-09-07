"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Movie } from "@/types";
import {
  getMovies,
  getMovieById,
  searchMovies as searchMoviesApi,
} from "@/services/api/movieApi";

interface MovieContextType {
  movies: Movie[];
  featuredMovie: Movie | null;
  loading: boolean;
  fetchMovies: (params?: MovieFilterParams) => Promise<void>;
  fetchMovieById: (id: string) => Promise<Movie | null>;
  searchMovies: (query: string) => Promise<Movie[]>;
  getMoviesByCategory: (category: string) => Promise<Movie[]>;
}

export interface MovieFilterParams {
  genre?: string;
  year?: number;
  premium?: boolean;
  page?: number;
  limit?: number;
}

/**
 * In-file mock data retained as an offline fallback. It is used whenever an API
 * call fails or returns an empty result, so the UI still renders in this
 * offline sandbox and in local dev without a database.
 */
const MOCK_MOVIES: Movie[] = [
  {
    id: "1",
    title: "Interstellar",
    description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
    poster: "https://images.unsplash.com/photo-1534970233-63f6-5155-8517-030c90785d25?w=400",
    background: "https://images.unsplash.com/photo-1534970233-63f6-5155-8517-030c90785d25?w=1200",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Interstellar.mp4",
    rating: 9.4,
    year: 2014,
    duration: "2h 49m",
    genre: "Sci-Fi",
    cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
    director: "Christopher Nolan",
    premium: true,
    views: 1500000,
    downloadCount: 45000,
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    title: "The Dark Knight",
    description: "Batman faces the Joker in a battle to save Gotham City from chaos.",
    poster: "https://images.unsplash.com/photo-1509347528169-243595531671?w=400",
    background: "https://images.unsplash.com/photo-1509347528169-243595531671?w=1200",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    rating: 9.0,
    year: 2008,
    duration: "2h 32m",
    genre: "Action",
    cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
    director: "Christopher Nolan",
    premium: false,
    views: 2000000,
    downloadCount: 60000,
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-01-10T10:00:00Z",
  },
  {
    id: "3",
    title: "Inception",
    description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.",
    poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=400",
    background: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=1200",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    rating: 8.8,
    year: 2010,
    duration: "2h 28m",
    genre: "Sci-Fi",
    cast: ["Leonardo DiCaprio", "Marion Cotillard", "Joseph Gordon-Levitt"],
    director: "Christopher Nolan",
    premium: true,
    views: 1800000,
    downloadCount: 55000,
    createdAt: "2024-01-08T10:00:00Z",
    updatedAt: "2024-01-08T10:00:00Z",
  },
];

const MovieContext = createContext<MovieContextType | undefined>(undefined);

export function MovieProvider({ children }: { children: ReactNode }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMovies = async (params?: MovieFilterParams) => {
    setLoading(true);
    try {
      const result = await getMovies(params);
      // Fall back to mock data when the API is unavailable or returns nothing,
      // so the UI still renders offline / without a DB.
      const list = result.length > 0 ? result : MOCK_MOVIES;
      setMovies(list);
      setFeaturedMovie(list[0] ?? null);
    } catch {
      setMovies(MOCK_MOVIES);
      setFeaturedMovie(MOCK_MOVIES[0] ?? null);
    } finally {
      setLoading(false);
    }
  };

  // Load the initial catalog on mount.
  useEffect(() => {
    fetchMovies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMovieById = async (id: string) => {
    setLoading(true);
    try {
      const movie = await getMovieById(id);
      if (movie) {
        return movie;
      }
      // Fall back to any already-loaded movie (mock or real) matching the id.
      return (
        movies.find((m) => m.id === id) ||
        MOCK_MOVIES.find((m) => m.id === id) ||
        null
      );
    } catch {
      return (
        movies.find((m) => m.id === id) ||
        MOCK_MOVIES.find((m) => m.id === id) ||
        null
      );
    } finally {
      setLoading(false);
    }
  };

  const searchMovies = async (query: string) => {
    setLoading(true);
    const localSearch = (source: Movie[]) =>
      source.filter(
        (m) =>
          m.title.toLowerCase().includes(query.toLowerCase()) ||
          m.genre.toLowerCase().includes(query.toLowerCase())
      );
    try {
      const result = await searchMoviesApi(query);
      if (result.length > 0) {
        return result;
      }
      // Fall back to filtering the loaded/mock catalog when the API returns
      // nothing (e.g. offline or empty DB).
      const source = movies.length > 0 ? movies : MOCK_MOVIES;
      return localSearch(source);
    } catch {
      const source = movies.length > 0 ? movies : MOCK_MOVIES;
      return localSearch(source);
    } finally {
      setLoading(false);
    }
  };

  const getMoviesByCategory = async (category: string) => {
    setLoading(true);
    const localFilter = (source: Movie[]) =>
      source.filter((m) =>
        m.genre.toLowerCase().includes(category.toLowerCase())
      );
    try {
      const result = await getMovies({ genre: category });
      if (result.length > 0) {
        return result;
      }
      const source = movies.length > 0 ? movies : MOCK_MOVIES;
      return localFilter(source);
    } catch {
      const source = movies.length > 0 ? movies : MOCK_MOVIES;
      return localFilter(source);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MovieContext.Provider
      value={{
        movies,
        featuredMovie,
        loading,
        fetchMovies,
        fetchMovieById,
        searchMovies,
        getMoviesByCategory,
      }}
    >
      {children}
    </MovieContext.Provider>
  );
}

export function useMovies() {
  const context = useContext(MovieContext);
  if (context === undefined) {
    throw new Error("useMovies must be used within a MovieProvider");
  }
  return context;
}

export default MovieContext;
