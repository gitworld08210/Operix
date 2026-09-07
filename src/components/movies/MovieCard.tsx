"use client";

import { Movie } from "@/types";
import Link from "next/link";
import { useState } from "react";

interface MovieCardProps {
  movie: Movie;
  variant?: "default" | "small" | "large";
}

export default function MovieCard({ movie, variant = "default" }: MovieCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Variants for different display sizes
  const getCardStyles = () => {
    switch (variant) {
      case "large":
        return "w-96 flex-shrink-0";
      case "small":
        return "w-48 flex-shrink-0";
      default:
        return "w-64 flex-shrink-0";
    }
  };

  const getPosterSize = () => {
    switch (variant) {
      case "large":
        return "h-56";
      case "small":
        return "h-36";
      default:
        return "h-48";
    }
  };

  return (
    <Link href={`/movie/${movie.id}`}>
      <div
        className={`${getCardStyles()} cursor-pointer group relative`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Movie Poster */}
        <div className={`relative overflow-hidden rounded-lg ${getPosterSize()} mb-2`}>
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          
          {/* Hover Overlay */}
          {isHovered && (
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-xs text-gray-300 line-clamp-2 mb-2">{movie.description}</p>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span className="text-green-500 font-bold">{movie.rating * 10}% Match</span>
                  <span>{movie.year}</span>
                  <span>{movie.duration}</span>
                </div>
              </div>
            </div>
          )}

          {/* Premium Badge */}
          {movie.premium && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold rounded">
              PREMIUM
            </div>
          )}
        </div>

        {/* Movie Title */}
        <h3 className="text-white font-semibold truncate">{movie.title}</h3>
        
        {/* Movie Meta Info */}
        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
          <span>{movie.year}</span>
          <span className="border border-gray-700 px-0.5 rounded text-gray-400">
            {movie.duration}
          </span>
          <span>{movie.genre}</span>
        </div>
      </div>
    </Link>
  );
}
