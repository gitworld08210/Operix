"use client";

import Hero from "@/components/hero/Hero";
import MovieCarousel from "@/components/movies/MovieCarousel";
import { useMovies } from "@/contexts/MovieContext";
import { Category } from "@/types";

const categories: Category[] = [
  { id: "trending", title: "Trending Now", icon: "🔥" },
  { id: "movies", title: "Movies", icon: "🎬" },
  { id: "series", title: "TV Series", icon: "📺" },
  { id: "action", title: "Action", icon: "💥" },
  { id: "scifi", title: "Sci-Fi", icon: "🚀" },
  { id: "drama", title: "Drama", icon: "🎭" },
  { id: "comedy", title: "Comedy", icon: "😂" },
  { id: "horror", title: "Horror", icon: "👻" },
];

export default function Home() {
  const { featuredMovie, loading } = useMovies();

  if (loading || !featuredMovie) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#141414] via-[#0f0f0f] to-[#050505] z-0" />
      
      {/* Hero Section */}
      <Hero movie={featuredMovie} />
      
      {/* Movie Categories */}
      <div className="relative z-10 -mt-20 space-y-8 pb-12">
        {categories.map((category) => (
          <MovieCarousel 
            key={category.id} 
            title={category.title} 
            icon={category.icon}
            categoryId={category.id}
          />
        ))}
      </div>
    </div>
  );
}
