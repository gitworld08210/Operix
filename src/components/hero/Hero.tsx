"use client";

import { useState, useEffect } from "react";
import { Movie } from "@/types";
import Link from "next/link";
import clsx from "clsx";

interface HeroProps {
  movie: Movie;
}

export default function Hero({ movie }: HeroProps) {
  const [scrolled, setScrolled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!movie) return null;

  return (
    <div className="relative w-full min-h-screen">
      {/* Hero Background with Gradient */}
      <div className="relative h-[60vh] md:h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={movie.background}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#141414]/40 via-[#141414]/60 to-[#141414] hero-pattern" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/40 via-[#141414]/20 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-center px-4 md:px-12 pt-20">
          <div className="max-w-2xl animate-fade-in-up">
            {/* Premium Badge */}
            {movie.premium && (
              <div className="inline-flex items-center space-x-2 mb-4">
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold rounded">
                  PREMIUM
                </span>
                <span className="text-gray-300 text-sm">Premium Content</span>
              </div>
            )}

            {/* Movie Title */}
            <h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight tracking-tight">
              {movie.title}
            </h1>

            {/* Movie Info */}
            <div className="flex items-center space-x-4 mb-4 text-sm md:text-base">
              <span className="text-green-500 font-bold">{movie.rating * 10}% Match</span>
              <span className="text-gray-300">{movie.year}</span>
              <span className="border border-gray-500 px-1 text-gray-300 rounded">
                {movie.duration}
              </span>
              <span className="text-gray-300">{movie.genre}</span>
            </div>

            {/* Movie Description */}
            <p className="text-gray-300 text-base md:text-lg mb-6 line-clamp-3 leading-relaxed">
              {movie.description}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                href={`/movie/${movie.id}`}
                className="flex items-center space-x-2 px-8 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Play</span>
              </Link>

              <Link
                href={`/movie/${movie.id}`}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-600/70 text-white font-bold rounded hover:bg-gray-600/90 transition-colors backdrop-blur-sm"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <span>More Info</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce hidden md:block">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
