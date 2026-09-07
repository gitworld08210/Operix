"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Movie, ApiResponse } from "@/types";

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

const MovieContext = createContext<MovieContextType | undefined>(undefined);

export function MovieProvider({ children }: { children: ReactNode }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock data - will be replaced with API calls
  useEffect(() => {
    const mockMovies: Movie[] = [
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

    setMovies(mockMovies);
    setFeaturedMovie(mockMovies[0]);
    setLoading(false);
  }, []);

  const fetchMovies = async (params?: MovieFilterParams) => {
    setLoading(true);
    // API call will be implemented later
    // const response = await fetch(`/api/movies${params ? '?' + new URLSearchParams(params) : ''}`);
    // const data: ApiResponse<Movie[]> = await response.json();
    // setMovies(data.data || []);
    setLoading(false);
  };

  const fetchMovieById = async (id: string) => {
    setLoading(true);
    // API call will be implemented later
    // const response = await fetch(`/api/movies/${id}`);
    // const data: ApiResponse<Movie> = await response.json();
    // return data.data || null;
    setLoading(false);
    return movies.find((m) => m.id === id) || null;
  };

  const searchMovies = async (query: string) => {
    setLoading(true);
    // API call will be implemented later
    // const response = await fetch(`/api/movies/search?q=${query}`);
    // const data: ApiResponse<Movie[]> = await response.json();
    // return data.data || [];
    setLoading(false);
    return movies.filter(
      (m) =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.genre.toLowerCase().includes(query.toLowerCase())
    );
  };

  const getMoviesByCategory = async (category: string) => {
    setLoading(true);
    // API call will be implemented later
    setLoading(false);
    return movies.filter((m) => m.genre.toLowerCase().includes(category.toLowerCase()));
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
