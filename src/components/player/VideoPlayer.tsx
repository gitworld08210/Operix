"use client";

import { useState, useRef, useEffect } from "react";
import { Movie } from "@/types";
import { useUser } from "@/contexts/UserContext";

interface VideoPlayerProps {
  movie: Movie;
}

export default function VideoPlayer({ movie }: VideoPlayerProps) {
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentQuality, setCurrentQuality] = useState("1080p");
  const [showAd, setShowAd] = useState(false);
  const [adCompleted, setAdCompleted] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<"idle" | "downloading" | "completed" | "error">("idle");

  const qualities = ["480p", "720p", "1080p", "4K"];

  // Check if user needs to watch ad (free users watching premium content)
  useEffect(() => {
    if (!user?.isPremium && movie.premium) {
      const adCompleted = localStorage.getItem("ott_ad_completed");
      if (!adCompleted) {
        setShowAd(true);
      }
    }
  }, [user, movie]);

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleQualityChange = (quality: string) => {
    setCurrentQuality(quality);
    setShowQualityMenu(false);
    // In a real app, this would change the video source
  };

  const handleAdComplete = () => {
    setAdCompleted(true);
    setShowAd(false);
    localStorage.setItem("ott_ad_completed", "true");
  };

  const handleDownload = async () => {
    if (!user) {
      alert("Please login first to download");
      return;
    }

    if (user.isPremium) {
      setDownloadStatus("downloading");
      // Simulate download
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setDownloadStatus("completed");
      setTimeout(() => setDownloadStatus("idle"), 3000);
    } else if (movie.premium) {
      // Free user trying to download premium content
      setShowAd(true);
    } else {
      // Free user downloading free content
      setDownloadStatus("downloading");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setDownloadStatus("completed");
      setTimeout(() => setDownloadStatus("idle"), 3000);
    }
  };

  // Mock video URL - replace with actual Azure Blob Storage URL
  const videoUrl = movie.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  if (showAd) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#000000] flex items-center justify-center">
        <div className="relative w-full max-w-4xl aspect-video bg-black">
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <p className="text-white text-2xl font-bold mb-4">Advertisement</p>
            <div className="w-16 h-16 border-4 border-[#E50914] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400">Watching this ad will unlock content...</p>
          </div>
          <button
            onClick={handleAdComplete}
            className="absolute bottom-4 right-4 px-6 py-2 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors"
          >
            Skip Ad
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Video Container */}
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          poster={movie.background}
          controls={false}
          autoPlay={true}
          onClick={handlePlay}
        />

        {/* Play Overlay */}
        {!isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
            onClick={handlePlay}
          >
            <div className="w-20 h-20 bg-[#E50914] rounded-full flex items-center justify-center hover:scale-110 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-white ml-1"
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
            </div>
          </div>
        )}

        {/* Ad Required Overlay for Free Users */}
        {!user?.isPremium && movie.premium && !showAd && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Premium Content</h3>
              <p className="text-gray-300 mb-6">This movie is available for premium members only.</p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handlePlay}
                  className="px-6 py-3 bg-gray-700 text-white font-bold rounded hover:bg-gray-600 transition-colors"
                >
                  Preview (with ads)
                </button>
                <button
                  onClick={() => (window.location.href = "/premium")}
                  className="px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors"
                >
                  Upgrade to Premium
                </button>
              </div>
              <p className="text-gray-500 mt-4 text-sm">Watch ads to unlock full movie</p>
            </div>
          </div>
        )}

        {/* Video Controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300">
          {/* Top Bar */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
            <h1 className="text-white text-xl md:text-2xl font-bold">{movie.title}</h1>
            <button
              onClick={() => (window.location.href = "/")}
              className="text-white hover:text-gray-300"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-gray-600 rounded-full mb-4 cursor-pointer relative group">
              <div className="absolute top-0 left-0 h-full bg-[#E50914] rounded-full" style={{ width: "30%" }}></div>
              <div className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: "30%" }}></div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button onClick={handlePlay} className="text-white hover:text-gray-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={isPlaying ? "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" : "M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"}
                    />
                  </svg>
                </button>

                {/* Quality Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="text-white hover:text-gray-300 flex items-center gap-2"
                  >
                    <span className="text-sm font-medium">{currentQuality}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Quality Menu */}
                  {showQualityMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-32 bg-[#1f1f1f] rounded-lg shadow-xl overflow-hidden">
                      {qualities.map((quality) => (
                        <button
                          key={quality}
                          onClick={() => handleQualityChange(quality)}
                          className="w-full px-4 py-2 text-left text-sm text-white hover:bg-[#E50914] transition-colors"
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen */}
                <button className="text-white hover:text-gray-300">
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
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button>
              </div>

              {/* Download Button */}
              <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm hidden md:block">
                  {user?.isPremium ? "Premium Member" : "Free User"}
                </span>
                <button
                  onClick={handleDownload}
                  disabled={downloadStatus === "downloading" || downloadStatus === "completed"}
                  className={`flex items-center gap-2 px-4 py-2 rounded font-medium transition-colors ${
                    downloadStatus === "completed"
                      ? "bg-green-600 text-white"
                      : "bg-[#E50914] text-white hover:bg-[#F40612]"
                  }`}
                >
                  {downloadStatus === "downloading" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Downloading...
                    </>
                  ) : downloadStatus === "completed" ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Downloaded
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Download
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Movie Info */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{movie.title}</h1>
        
        <div className="flex items-center gap-4 mb-6 text-sm md:text-base">
          <span className="text-green-500 font-bold">{movie.rating * 10}% Match</span>
          <span className="border border-gray-700 px-1 rounded text-gray-400">{movie.year}</span>
          <span>{movie.duration}</span>
          <span>{movie.genre}</span>
        </div>

        <p className="text-gray-300 text-lg mb-8 max-w-3xl">{movie.description}</p>

        {/* Cast Section */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4">Cast</h3>
          <div className="flex flex-wrap gap-4">
            {movie.cast.map((actor, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-12 h-12 bg-gray-700 rounded-full overflow-hidden">
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {actor.charAt(0)}
                  </div>
                </div>
                <span className="text-gray-300">{actor}</span>
              </div>
            ))}
          </div>
        </div>

        {/* More Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1f1f1f] p-6 rounded-lg">
            <h4 className="text-white font-bold mb-2">Director</h4>
            <p className="text-gray-400">{movie.director}</p>
          </div>
          <div className="bg-[#1f1f1f] p-6 rounded-lg">
            <h4 className="text-white font-bold mb-2">Stats</h4>
            <p className="text-gray-400">{movie.views.toLocaleString()} views • {movie.downloadCount.toLocaleString()} downloads</p>
          </div>
        </div>
      </div>
    </div>
  );
}
