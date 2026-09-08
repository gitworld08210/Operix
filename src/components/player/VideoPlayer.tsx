"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useUser } from "@/contexts/UserContext";
import type { ApiResponse, Movie } from "@/types";

/**
 * Premium native-`<video>` player with a 1-hour unlock gate.
 *
 * Security model: the player NEVER receives the permanent blob URL. It asks the
 * server (`/api/playback/...`) for a short-lived SAS URL, and the server only
 * mints one after confirming the viewer is premium or holds an active rental.
 * A locked viewer sees an unlock overlay; a free user can "Unlock for 1 hour"
 * (`POST /api/unlock`) which creates a rental, after which playback is fetched.
 *
 * The 1-hour countdown mirrors the rental's real `expiresAt`; when it reaches
 * zero the video pauses and the unlock overlay returns, matching the server's
 * authorisation (a re-fetch after expiry would 403).
 */

/** Optional episode coordinates; when present the player targets an episode. */
export interface EpisodeTarget {
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  /** Display title for the episode (falls back to the movie/series title). */
  title?: string;
}

interface VideoPlayerProps {
  movie: Movie;
  /** When supplied, playback targets this episode instead of the movie. */
  episode?: EpisodeTarget;
}

/** Brand red used across the app. */
const BRAND_RED = "#E50914";

/** Response shape from the playback endpoints. */
interface PlaybackData {
  url: string;
  expiresAt: string;
  premium: boolean;
}

/** Response shape from the unlock / status endpoints. */
interface UnlockData {
  unlocked?: boolean;
  access?: boolean;
  expiresAt: string | null;
  premium: boolean;
}

type Phase = "loading" | "locked" | "ready" | "expired" | "error";

/** Format seconds as m:ss or h:mm:ss. */
function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const ss = String(s).padStart(2, "0");
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
  return `${m}:${ss}`;
}

/** Format a millisecond countdown as mm:ss remaining. */
function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function VideoPlayer({ movie, episode }: VideoPlayerProps) {
  const { user } = useUser();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [isPremiumAccess, setIsPremiumAccess] = useState(false);
  /** Rental expiry (ms epoch) for the countdown, or null for premium. */
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [countdownMs, setCountdownMs] = useState<number | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const title = episode?.title ?? movie.title;

  /** Stable key for persisting resume position (per content, not per user). */
  const progressKey = episode
    ? `ott_progress_ep_${episode.seriesId}_${episode.seasonNumber}_${episode.episodeNumber}`
    : `ott_progress_movie_${movie.id}`;

  /** Build the request body/params identifying this content for the APIs. */
  const contentDescriptor = useCallback(() => {
    if (episode) {
      return {
        contentType: "episode" as const,
        contentId: episode.seriesId,
        seriesId: episode.seriesId,
        seasonNumber: episode.seasonNumber,
        episodeNumber: episode.episodeNumber,
      };
    }
    return { contentType: "movie" as const, contentId: movie.id };
  }, [episode, movie.id]);

  /** URL of the SAS-minting playback endpoint for this content. */
  const playbackUrl = useCallback(() => {
    if (episode) {
      const q = new URLSearchParams({
        seasonNumber: String(episode.seasonNumber),
        episodeNumber: String(episode.episodeNumber),
      });
      return `/api/playback/episode/${episode.seriesId}?${q.toString()}`;
    }
    return `/api/playback/movie/${movie.id}`;
  }, [episode, movie.id]);

  /** Fetch a fresh signed source URL. Returns true on success. */
  const loadPlayback = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(playbackUrl(), {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (res.status === 401) {
        setPhase("locked");
        return false;
      }
      if (res.status === 403) {
        setPhase("locked");
        return false;
      }
      if (!res.ok) {
        setErrorMessage("Playback is currently unavailable.");
        setPhase("error");
        return false;
      }

      const body = (await res.json()) as ApiResponse<PlaybackData>;
      if (!body.success || !body.data) {
        setPhase("locked");
        return false;
      }

      setSourceUrl(body.data.url);
      setIsPremiumAccess(body.data.premium);
      if (!body.data.premium) {
        setExpiresAtMs(new Date(body.data.expiresAt).getTime());
      } else {
        setExpiresAtMs(null);
      }
      setPhase("ready");
      return true;
    } catch {
      setErrorMessage("Cannot reach the server. Check your connection.");
      setPhase("error");
      return false;
    }
  }, [playbackUrl]);

  /**
   * On mount / when the viewer changes, ask the server for access status. If
   * unlocked, immediately fetch the signed source; otherwise show the overlay.
   */
  useEffect(() => {
    let active = true;
    setPhase("loading");
    setSourceUrl(null);

    (async () => {
      const d = contentDescriptor();
      const q = new URLSearchParams({
        contentType: d.contentType,
        contentId: d.contentId,
      });
      if (d.contentType === "episode") {
        q.set("seriesId", d.seriesId);
        q.set("seasonNumber", String(d.seasonNumber));
        q.set("episodeNumber", String(d.episodeNumber));
      }

      try {
        const res = await fetch(`/api/unlock/status?${q.toString()}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!active) return;

        if (res.status === 401) {
          setPhase("locked");
          return;
        }

        const body = (await res.json()) as ApiResponse<UnlockData>;
        if (body.success && body.data?.access) {
          await loadPlayback();
        } else {
          setPhase("locked");
        }
      } catch {
        if (active) setPhase("locked");
      }
    })();

    return () => {
      active = false;
    };
  }, [contentDescriptor, loadPlayback, user]);

  /** Countdown ticker driven by the real rental expiry. */
  useEffect(() => {
    if (expiresAtMs === null) {
      setCountdownMs(null);
      return;
    }

    const tick = () => {
      const remaining = expiresAtMs - Date.now();
      setCountdownMs(remaining);
      if (remaining <= 0) {
        const video = videoRef.current;
        if (video) video.pause();
        setIsPlaying(false);
        setPhase("expired");
        setSourceUrl(null);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtMs]);

  /** Unlock handler for the overlay's "Unlock for 1 hour" button. */
  const handleUnlock = useCallback(async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setUnlocking(true);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contentDescriptor()),
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        setErrorMessage("Could not unlock this title. Please try again.");
        setPhase("error");
        return;
      }

      await loadPlayback();
    } catch {
      setErrorMessage("Cannot reach the server. Check your connection.");
      setPhase("error");
    } finally {
      setUnlocking(false);
    }
  }, [user, contentDescriptor, loadPlayback]);

  // --- Native <video> wiring -------------------------------------------------

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration || time));
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      seekTo(video.currentTime + delta);
    },
    [seekTo],
  );

  const changeVolume = useCallback((next: number) => {
    const video = videoRef.current;
    const clamped = Math.max(0, Math.min(1, next));
    setVolume(clamped);
    setMuted(clamped === 0);
    if (video) {
      video.volume = clamped;
      video.muted = clamped === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }, []);

  const changeRate = useCallback((rate: number) => {
    const video = videoRef.current;
    setPlaybackRate(rate);
    if (video) video.playbackRate = rate;
  }, []);

  /** Track fullscreen changes from any source (button, Esc, F key). */
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /** Resume from the last saved position once the source metadata loads. */
  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    try {
      const saved = window.localStorage.getItem(progressKey);
      if (saved) {
        const seconds = Number(saved);
        // Only resume if it's a sensible mid-video position.
        if (Number.isFinite(seconds) && seconds > 5 && seconds < video.duration - 5) {
          video.currentTime = seconds;
        }
      }
    } catch {
      // localStorage may be unavailable (private mode); ignore.
    }
    video.volume = volume;
    video.playbackRate = playbackRate;
  }, [progressKey, volume, playbackRate]);

  /** Persist progress as the video plays (throttled to whole seconds). */
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Buffered end (for the buffer indicator).
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }

    try {
      window.localStorage.setItem(progressKey, String(Math.floor(video.currentTime)));
    } catch {
      // ignore storage errors
    }
  }, [progressKey]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    try {
      window.localStorage.removeItem(progressKey);
    } catch {
      // ignore
    }
  }, [progressKey]);

  // --- Auto-hiding controls --------------------------------------------------

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  // --- Keyboard shortcuts ----------------------------------------------------

  useEffect(() => {
    if (phase !== "ready") return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Don't hijack typing in inputs.
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-5);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(volume - 0.1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        default:
          break;
      }
      showControls();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, togglePlay, skip, changeVolume, toggleFullscreen, toggleMute, volume, showControls]);

  // --- Overlays --------------------------------------------------------------

  const renderInfo = () => (
    <div className="max-w-7xl mx-auto px-4 md:px-12 py-8">
      <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{title}</h1>
      <div className="flex items-center gap-4 mb-6 text-sm md:text-base">
        <span className="text-green-500 font-bold">
          {Math.round(movie.rating * 10)}% Match
        </span>
        <span className="border border-gray-700 px-1 rounded text-gray-400">
          {movie.year}
        </span>
        <span>{movie.duration}</span>
        <span>{movie.genre}</span>
      </div>
      <p className="text-gray-300 text-lg mb-8 max-w-3xl">{movie.description}</p>
      {movie.cast.length > 0 && (
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
      )}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <h4 className="text-white font-bold mb-2">Director</h4>
          <p className="text-gray-400">{movie.director}</p>
        </div>
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <h4 className="text-white font-bold mb-2">Stats</h4>
          <p className="text-gray-400">
            {movie.views.toLocaleString()} views
          </p>
        </div>
      </div>
    </div>
  );

  /** The unlock / login / expired overlay shown over the poster. */
  const renderGate = () => {
    const loggedOut = !user;
    const expired = phase === "expired";

    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 px-4">
        <div className="text-center max-w-md">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            {expired ? "Your hour is up" : "Unlock to watch"}
          </h3>
          <p className="text-gray-300 mb-6">
            {loggedOut
              ? "Sign in to unlock this title for 1 hour."
              : expired
                ? "This rental has expired. Unlock again for another hour."
                : "Unlock this title for 1 hour of unlimited playback."}
          </p>
          {loggedOut ? (
            <button
              onClick={() => (window.location.href = "/login")}
              className="px-8 py-3 font-bold rounded text-white transition-colors"
              style={{ backgroundColor: BRAND_RED }}
            >
              Sign in
            </button>
          ) : (
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="px-8 py-3 font-bold rounded text-white transition-colors disabled:opacity-60 inline-flex items-center gap-2"
              style={{ backgroundColor: BRAND_RED }}
            >
              {unlocking && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {unlocking ? "Unlocking..." : "Unlock for 1 hour"}
            </button>
          )}
          <p className="text-gray-500 mt-4 text-sm">
            Premium members watch instantly, no unlock needed.
          </p>
        </div>
      </div>
    );
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-black">
      <div
        ref={containerRef}
        className="relative aspect-video bg-black group"
        onMouseMove={showControls}
        onMouseLeave={() => {
          if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
        }}
      >
        {/* The signed source is only ever set after a successful playback fetch. */}
        {sourceUrl && phase === "ready" ? (
          <video
            ref={videoRef}
            src={sourceUrl}
            className="w-full h-full object-contain bg-black"
            poster={movie.background}
            playsInline
            onClick={togglePlay}
            onPlay={() => {
              setIsPlaying(true);
              showControls();
            }}
            onPause={() => {
              setIsPlaying(false);
              setControlsVisible(true);
            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
          />
        ) : (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${movie.background})` }}
          >
            <div className="absolute inset-0 bg-black/60" />
          </div>
        )}

        {/* Loading state */}
        {phase === "loading" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center">
            <div
              className="w-14 h-14 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: BRAND_RED, borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 px-4">
            <div className="text-center">
              <p className="text-white text-lg mb-4">{errorMessage}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 font-bold rounded text-white"
                style={{ backgroundColor: BRAND_RED }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Unlock / login / expired gate */}
        {(phase === "locked" || phase === "expired") && renderGate()}

        {/* Buffering spinner while playing */}
        {phase === "ready" && isBuffering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div
              className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: BRAND_RED, borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Center play button when paused */}
        {phase === "ready" && !isPlaying && !isBuffering && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
            onClick={togglePlay}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: BRAND_RED }}
            >
              <svg className="h-10 w-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Controls overlay (only when a source is playing) */}
        {phase === "ready" && (
          <div
            className={`absolute inset-0 z-10 transition-opacity duration-300 ${
              controlsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
              <h1 className="text-white text-lg md:text-2xl font-bold truncate pr-4">
                {title}
              </h1>
              <div className="flex items-center gap-4">
                {countdownMs !== null && (
                  <span
                    className="text-white text-sm font-mono px-3 py-1 rounded"
                    style={{ backgroundColor: BRAND_RED }}
                    title="Time left on your 1-hour unlock"
                  >
                    {formatCountdown(countdownMs)}
                  </span>
                )}
                {isPremiumAccess && (
                  <span className="text-yellow-400 text-sm font-semibold hidden md:block">
                    Premium
                  </span>
                )}
                <button
                  onClick={() => (window.location.href = "/")}
                  className="text-white hover:text-gray-300"
                  aria-label="Close"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-black/90 to-transparent">
              {/* Seek bar with buffered indicator */}
              <div className="mb-3 flex items-center gap-3">
                <span className="text-white text-xs font-mono w-14 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="relative flex-1 h-1.5 group/seek">
                  <div className="absolute inset-0 bg-gray-600 rounded-full" />
                  <div
                    className="absolute inset-y-0 left-0 bg-gray-400 rounded-full"
                    style={{ width: `${bufferedPercent}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${progressPercent}%`, backgroundColor: BRAND_RED }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step="any"
                    value={currentTime}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Seek"
                  />
                </div>
                <span className="text-white text-xs font-mono w-14">
                  {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  <button onClick={togglePlay} className="text-white hover:text-gray-300" aria-label={isPlaying ? "Pause" : "Play"}>
                    {isPlaying ? (
                      <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                      </svg>
                    ) : (
                      <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button onClick={() => skip(-10)} className="text-white hover:text-gray-300" aria-label="Back 10 seconds">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                    </svg>
                  </button>
                  <button onClick={() => skip(10)} className="text-white hover:text-gray-300" aria-label="Forward 10 seconds">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="text-white hover:text-gray-300" aria-label={muted ? "Unmute" : "Mute"}>
                      {muted || volume === 0 ? (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m0 4l-4-4" />
                        </svg>
                      ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      )}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={muted ? 0 : volume}
                      onChange={(e) => changeVolume(Number(e.target.value))}
                      className="w-20 accent-[#E50914] cursor-pointer hidden sm:block"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                  {/* Playback speed */}
                  <select
                    value={playbackRate}
                    onChange={(e) => changeRate(Number(e.target.value))}
                    className="bg-[#1f1f1f] text-white text-sm rounded px-2 py-1 border border-gray-700 cursor-pointer"
                    aria-label="Playback speed"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <option key={rate} value={rate}>
                        {rate}x
                      </option>
                    ))}
                  </select>

                  {/* Fullscreen */}
                  <button onClick={toggleFullscreen} className="text-white hover:text-gray-300" aria-label="Toggle fullscreen">
                    {isFullscreen ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v4m0-4h4m7 5l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m7-5l5 5m0 0v-4m0 4h-4" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {renderInfo()}
    </div>
  );
}
