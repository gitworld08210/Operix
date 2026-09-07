"use client";

import { useState, useRef, useEffect } from "react";
import MovieCard from "./MovieCard";
import { Movie } from "@/types";

interface MovieCarouselProps {
  title: string;
  icon: string;
  categoryId: string;
  movies?: Movie[];
}

export default function MovieCarousel({
  title,
  icon,
  categoryId,
  movies: externalMovies,
}: MovieCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Use external movies or generate mock data
  const movies = externalMovies || generateMockMovies(categoryId);

  const handleScroll = () => {
    if (carouselRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const { current } = carouselRef;
      const scrollAmount = current.clientWidth * 0.8;
      const behavior = "smooth";

      if (direction === "left") {
        current.scrollBy({ left: -scrollAmount, behavior });
      } else {
        current.scrollBy({ left: scrollAmount, behavior });
      }
    }
  };

  useEffect(() => {
    handleScroll();
  }, [movies]);

  return (
    <div className="px-4 md:px-12 pb-6">
      {/* Carousel Header */}
      <div className="flex items-center justify-between mb-4 hover:text-gray-300 transition-colors cursor-pointer group">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{icon}</span>
          <h2 className="text-lg md:text-xl font-semibold text-gray-200 group-hover:text-white transition-colors">
            {title}
          </h2>
          <span className="text-xs text-gray-500 hidden md:inline">•</span>
          <span className="text-xs text-gray-500 hidden md:inline">10 Movies</span>
        </div>
        <span className="text-sm text-gray-400 hover:text-white transition-colors hidden md:block">
          Show All
        </span>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Left Scroll Button */}
        <button
          onClick={() => scroll("left")}
          className={`absolute top-1/2 -left-4 md:-left-8 z-20 transform -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#141414]/60 hover:bg-[#141414]/90 rounded-full transition-all duration-300 ${
            canScrollLeft ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 md:h-8 md:w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Movies Row */}
        <div
          ref={carouselRef}
          className="flex space-x-4 overflow-x-auto scrollbar-hide px-2 py-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          onScroll={handleScroll}
        >
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} variant="default" />
          ))}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scroll("right")}
          className={`absolute top-1/2 -right-4 md:-right-8 z-20 transform -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-[#141414]/60 hover:bg-[#141414]/90 rounded-full transition-all duration-300 ${
            canScrollRight ? "opacity-100 visible" : "opacity-0 invisible"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 md:h-8 md:w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Mock data generator
function generateMockMovies(categoryId: string): Movie[] {
  const mockMovies: Movie[] = [
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
      description: "A thief who steals corporate secrets through the use of dream-sharing technology.",
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
    {
      id: "4",
      title: "Pulp Fiction",
      description: "The lives of two mob hitmen, a boxer, and a pair of diner bandits intertwine.",
      poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=400",
      background: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=1200",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      rating: 8.9,
      year: 1994,
      duration: "2h 34m",
      genre: "Crime",
      cast: ["John Travolta", "Uma Thurman", "Samuel L. Jackson"],
      director: "Quentin Tarantino",
      premium: false,
      views: 1200000,
      downloadCount: 35000,
      createdAt: "2024-01-05T10:00:00Z",
      updatedAt: "2024-01-05T10:00:00Z",
    },
    {
      id: "5",
      title: "The Godfather",
      description: "The aging patriarch of an organized crime dynasty transfers control to his son.",
      poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=400",
      background: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=1200",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      rating: 9.2,
      year: 1972,
      duration: "2h 55m",
      genre: "Crime",
      cast: ["Marlon Brando", "Al Pacino", "James Caan"],
      director: "Francis Ford Coppola",
      premium: true,
      views: 1500000,
      downloadCount: 40000,
      createdAt: "2024-01-03T10:00:00Z",
      updatedAt: "2024-01-03T10:00:00Z",
    },
    {
      id: "6",
      title: "Forrest Gump",
      description: "The presidencies of Kennedy and Johnson, the Vietnam War, and more through the eyes of an Alabama man.",
      poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=400",
      background: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=1200",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      rating: 8.8,
      year: 1994,
      duration: "2h 22m",
      genre: "Drama",
      cast: ["Tom Hanks", "Robin Wright", "Gary Sinise"],
      director: "Robert Zemeckis",
      premium: false,
      views: 1400000,
      downloadCount: 38000,
      createdAt: "2024-01-01T10:00:00Z",
      updatedAt: "2024-01-01T10:00:00Z",
    },
    {
      id: "7",
      title: "The Matrix",
      description: "A computer hacker learns from mysterious rebels about the true nature of his reality.",
      poster: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=400",
      background: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a4?w=1200",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
      rating: 8.7,
      year: 1999,
      duration: "2h 16m",
      genre: "Sci-Fi",
      cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
      director: "The Wachowskis",
      premium: false,
      views: 1600000,
      downloadCount: 42000,
      createdAt: "2023-12-28T10:00:00Z",
      updatedAt: "2023-12-28T10:00:00Z",
    },
    {
      id: "8",
      title: "Interstellar",
      description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      poster: "https://images.unsplash.com/photo-1534970233-63f6-5155-8517-030c90785d25?w=400",
      background: "https://images.unsplash.com/photo-1534970233-63f6-5155-8517-030c90785d25?w=1200",
      videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
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
  ];
  return mockMovies;
}
