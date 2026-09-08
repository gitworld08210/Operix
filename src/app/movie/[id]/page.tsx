"use client";

import { useState, useEffect } from "react";
import { useMovies } from "@/contexts/MovieContext";
import VideoPlayer from "@/components/player/VideoPlayer";
import { Movie } from "@/types";

export default function MovieDetailPage({ params }: { params: { id: string } }) {
  const { fetchMovieById, movies } = useMovies();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMovie = async () => {
      setLoading(true);
      const fetchedMovie = await fetchMovieById(params.id);
      setMovie(fetchedMovie);
      setLoading(false);
    };

    loadMovie();
  }, [params.id, fetchMovieById]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white">Loading movie details...</div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Movie not found</h2>
          <p className="text-gray-400">The movie you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#141414]">
      <VideoPlayer movie={movie} />
    </div>
  );
}
