"use client";

import { useState, useEffect } from "react";
import { useMovies } from "@/contexts/MovieContext";
import MovieCard from "@/components/movies/MovieCard";
import { Movie } from "@/types";
import Link from "next/link";

const genres = ["All", "Action", "Sci-Fi", "Drama", "Crime", "Comedy", "Horror"];

export default function MoviesPage() {
  const { movies, loading, searchMovies } = useMovies();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>(movies);
  const [showOnlyPremium, setShowOnlyPremium] = useState(false);

  useEffect(() => {
    let result = movies;

    // Filter by genre
    if (selectedGenre !== "All") {
      result = result.filter((movie) =>
        movie.genre.toLowerCase() === selectedGenre.toLowerCase()
      );
    }

    // Filter by search query
    if (searchQuery) {
      result = result.filter(
        (movie) =>
          movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          movie.genre.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by premium
    if (showOnlyPremium) {
      result = result.filter((movie) => movie.premium);
    }

    setFilteredMovies(result);
  }, [movies, selectedGenre, searchQuery, showOnlyPremium]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white">Loading movies...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] pb-12">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#141414]/95 backdrop-blur-sm px-4 md:px-12 py-6 border-b border-[#2a2a2a]">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">Movies</h1>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search movies, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-2/3 px-6 py-3 bg-[#333333] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E50914] placeholder-gray-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Genre Filters */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedGenre === genre
                    ? "bg-[#E50914] text-white"
                    : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Premium Filter */}
          <button
            onClick={() => setShowOnlyPremium(!showOnlyPremium)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              showOnlyPremium
                ? "bg-yellow-600 text-white"
                : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]"
            }`}
          >
            <span className="text-lg">💎</span>
            Premium Only
          </button>
        </div>
      </div>

      {/* Movies Grid */}
      <div className="px-4 md:px-12 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-200">
            {filteredMovies.length} {filteredMovies.length === 1 ? "Movie" : "Movies"} Found
          </h2>
        </div>

        {filteredMovies.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h3 className="text-2xl font-bold text-white mb-2">No movies found</h3>
            <p className="text-gray-400">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedGenre("All");
                setShowOnlyPremium(false);
              }}
              className="mt-6 px-6 py-2 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
