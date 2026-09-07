"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

/**
 * Admin dashboard UI.
 *
 * All catalog content is admin-uploaded licensed media. This dashboard exposes
 * three upload flows, each backed by an admin-gated route handler:
 *   - Single movie  -> POST /api/upload/movie  (multipart)
 *   - Web series    -> POST /api/series + POST /api/upload/episode (multipart)
 *   - Bulk metadata -> POST /api/upload/bulk    (JSON array or CSV)
 *
 * Authorisation is carried by the httpOnly admin session cookie, which the
 * browser attaches to these same-origin requests automatically — there is no
 * token to paste any more. Access is gated on the server by the parent
 * `page.tsx`, so this component can assume an admin session exists.
 *
 * The `x-admin-token` header path still works server-side for scripts and CI
 * (see `lib/adminAuth.ts`); it is simply not needed by an interactive admin.
 */

type AdminTab = "dashboard" | "movie" | "series" | "bulk";

export default function AdminDashboardClient() {
  const { user, logout } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");

  const handleSignOut = async () => {
    await logout();
    router.push("/admin/login");
    router.refresh();
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "movie", label: "Upload Movie" },
    { id: "series", label: "Web Series" },
    { id: "bulk", label: "Bulk Upload" },
  ];

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Admin Header */}
      <div className="bg-[#1f1f1f] border-b border-[#2a2a2a]">
        <div className="px-4 md:px-12 py-4 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-white">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-2 md:gap-4">
            <span className="hidden sm:inline text-gray-400">
              {user?.email ?? "Admin"}
            </span>
            <button
              onClick={handleSignOut}
              className="px-3 md:px-4 py-2 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors text-sm md:text-base"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Tabs / Sidebar (horizontal scroll on mobile, sidebar on desktop) */}
        <nav className="md:w-64 bg-[#1f1f1f] md:border-r border-b md:border-b-0 border-[#2a2a2a] flex md:block overflow-x-auto">
          <div className="flex md:flex-col md:space-y-2 px-2 md:px-4 py-2 md:py-6 gap-2 md:gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap text-left px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-[#E50914] text-white"
                    : "text-gray-400 hover:bg-[#2a2a2a]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6">
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "movie" && <UploadMovieView />}
          {activeTab === "series" && <SeriesView />}
          {activeTab === "bulk" && <BulkUploadView />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

type UploadStatus = "idle" | "uploading" | "success" | "error";

/**
 * Upload multipart form data with progress reporting via XMLHttpRequest
 * (fetch cannot report upload progress). Resolves with the parsed JSON body.
 *
 * `withCredentials` is not needed: these are same-origin requests, so the
 * browser attaches the httpOnly admin session cookie by default.
 */
function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; status: number; body: any }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = { success: false, error: "Invalid server response" };
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body });
    };
    xhr.onerror = () => {
      resolve({ ok: false, status: 0, body: { success: false, error: "Network error" } });
    };
    xhr.send(form);
  });
}

function StatusBadge({ status, message }: { status: UploadStatus; message?: string }) {
  if (status === "idle") return null;
  const styles: Record<UploadStatus, string> = {
    idle: "",
    uploading: "bg-blue-900 text-blue-300",
    success: "bg-green-900 text-green-300",
    error: "bg-red-900 text-red-300",
  };
  return (
    <span className={`inline-block px-3 py-1 rounded text-sm ${styles[status]}`}>
      {message ??
        (status === "uploading"
          ? "Uploading…"
          : status === "success"
            ? "Success"
            : "Error")}
    </span>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-[#333333] rounded h-2 overflow-hidden">
      <div
        className="bg-[#E50914] h-2 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

const inputClass =
  "w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded outline-none";
const labelClass = "block text-sm font-medium text-gray-300 mb-2";

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

function DashboardView() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
        Dashboard Overview
      </h2>
      <div className="bg-[#1f1f1f] p-6 rounded-lg text-gray-300 space-y-3">
        <p>
          This platform serves <strong>admin-uploaded, licensed content only</strong>.
          Use the tabs above to add media:
        </p>
        <ul className="list-disc list-inside text-gray-400 space-y-1">
          <li>
            <span className="text-white">Upload Movie</span> — pick a video file;
            the thumbnail is auto-generated from the video (or override it with a
            custom poster).
          </li>
          <li>
            <span className="text-white">Web Series</span> — create a series, then
            upload episodes (video + auto-thumbnail) into its seasons.
          </li>
          <li>
            <span className="text-white">Bulk Upload</span> — paste a JSON array or
            CSV of metadata rows (with hosted video URLs) to create many titles at
            once.
          </li>
        </ul>
        <p className="text-sm text-gray-500">
          You are signed in as an administrator; uploads are authorised by your
          session automatically.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Single movie upload                                                */
/* ------------------------------------------------------------------ */

function UploadMovieView() {
  const [form, setForm] = useState({
    title: "",
    description: "",
    genre: "",
    year: "",
    duration: "",
    director: "",
    cast: "",
    rating: "",
    premium: false,
    poster: "",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string>();
  const [percent, setPercent] = useState(0);

  const update = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      setStatus("error");
      setMessage("Select a video file.");
      return;
    }

    const fd = new FormData();
    fd.append("video", videoFile);
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("genre", form.genre);
    fd.append("year", form.year);
    fd.append("duration", form.duration);
    fd.append("director", form.director);
    if (form.cast) fd.append("cast", form.cast);
    if (form.rating) fd.append("rating", form.rating);
    fd.append("premium", String(form.premium));
    if (form.poster) fd.append("poster", form.poster);

    setStatus("uploading");
    setMessage(undefined);
    setPercent(0);

    const res = await uploadWithProgress(
      "/api/upload/movie",
      fd,
      setPercent,
    );
    if (res.ok && res.body?.success) {
      setStatus("success");
      setMessage(`Uploaded "${res.body.data?.title ?? form.title}".`);
      setForm({
        title: "",
        description: "",
        genre: "",
        year: "",
        duration: "",
        director: "",
        cast: "",
        rating: "",
        premium: false,
        poster: "",
      });
      setVideoFile(null);
    } else {
      setStatus("error");
      setMessage(res.body?.error ?? `Upload failed (HTTP ${res.status}).`);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
        Upload New Movie
      </h2>
      <form
        onSubmit={handleSubmit}
        className="bg-[#1f1f1f] p-4 md:p-8 rounded-lg space-y-5"
      >
        <div>
          <label className={labelClass}>Movie Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update({ title: e.target.value })}
            className={inputClass}
            placeholder="Enter movie title"
            required
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => update({ description: e.target.value })}
            className={`${inputClass} h-28`}
            placeholder="Enter movie description"
            required
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Genre</label>
            <input
              type="text"
              value={form.genre}
              onChange={(e) => update({ genre: e.target.value })}
              className={inputClass}
              placeholder="e.g., Action, Sci-Fi"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => update({ year: e.target.value })}
              className={inputClass}
              placeholder="2024"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Duration</label>
            <input
              type="text"
              value={form.duration}
              onChange={(e) => update({ duration: e.target.value })}
              className={inputClass}
              placeholder="e.g., 2h 12m"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Director</label>
            <input
              type="text"
              value={form.director}
              onChange={(e) => update({ director: e.target.value })}
              className={inputClass}
              placeholder="Director name"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Cast (comma-separated)</label>
            <input
              type="text"
              value={form.cast}
              onChange={(e) => update({ cast: e.target.value })}
              className={inputClass}
              placeholder="Actor A, Actor B"
            />
          </div>
          <div>
            <label className={labelClass}>Rating (0–10)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={form.rating}
              onChange={(e) => update({ rating: e.target.value })}
              className={inputClass}
              placeholder="8.5"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>
            Custom poster URL (optional — leave blank to auto-generate from video)
          </label>
          <input
            type="url"
            value={form.poster}
            onChange={(e) => update({ poster: e.target.value })}
            className={inputClass}
            placeholder="https://…/poster.jpg"
          />
        </div>
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.premium}
            onChange={(e) => update({ premium: e.target.checked })}
            className="w-5 h-5 accent-[#E50914]"
          />
          <span className="text-gray-300">This is premium content</span>
        </label>
        <div>
          <label className={labelClass}>Video File</label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#E50914] file:text-white file:font-bold hover:file:bg-[#F40612]"
          />
          {videoFile && (
            <p className="text-gray-500 text-sm mt-2">{videoFile.name}</p>
          )}
        </div>

        {status === "uploading" && (
          <div className="space-y-2">
            <ProgressBar percent={percent} />
            <p className="text-sm text-gray-400">{percent}%</p>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "uploading"}
            className="px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] disabled:opacity-50"
          >
            {status === "uploading" ? "Uploading…" : "Upload Movie"}
          </button>
          <StatusBadge status={status} message={message} />
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Web series: create + upload episodes                              */
/* ------------------------------------------------------------------ */

function SeriesView() {
  // Series metadata form
  const [series, setSeries] = useState({
    title: "",
    description: "",
    genre: "",
    year: "",
    director: "",
    cast: "",
    rating: "",
    premium: false,
    poster: "",
    background: "",
  });
  const [createStatus, setCreateStatus] = useState<UploadStatus>("idle");
  const [createMessage, setCreateMessage] = useState<string>();
  const [seriesId, setSeriesId] = useState("");

  // Episode upload form
  const [episode, setEpisode] = useState({
    seasonNumber: "1",
    seasonTitle: "",
    episodeNumber: "1",
    title: "",
    description: "",
    duration: "",
  });
  const [episodeFile, setEpisodeFile] = useState<File | null>(null);
  const [epStatus, setEpStatus] = useState<UploadStatus>("idle");
  const [epMessage, setEpMessage] = useState<string>();
  const [epPercent, setEpPercent] = useState(0);

  const updateSeries = (patch: Partial<typeof series>) =>
    setSeries({ ...series, ...patch });
  const updateEpisode = (patch: Partial<typeof episode>) =>
    setEpisode({ ...episode, ...patch });

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateStatus("uploading");
    setCreateMessage(undefined);

    const payload = {
      title: series.title,
      description: series.description,
      poster: series.poster,
      background: series.background || series.poster,
      genre: series.genre,
      year: Number(series.year),
      director: series.director,
      cast: series.cast
        ? series.cast.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      rating: series.rating ? Number(series.rating) : 0,
      premium: series.premium,
    };

    const res = await fetch("/api/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.success) {
      setCreateStatus("success");
      setSeriesId(body.data.id);
      setCreateMessage(`Created series (id ${body.data.id}). Now add episodes.`);
    } else {
      setCreateStatus("error");
      setCreateMessage(body?.error ?? `Failed (HTTP ${res.status}).`);
    }
  };

  const handleUploadEpisode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesId) {
      setEpStatus("error");
      setEpMessage("Create the series first (or paste an existing series id).");
      return;
    }
    if (!episodeFile) {
      setEpStatus("error");
      setEpMessage("Select an episode video file.");
      return;
    }

    const fd = new FormData();
    fd.append("video", episodeFile);
    fd.append("seriesId", seriesId);
    fd.append("seasonNumber", episode.seasonNumber);
    if (episode.seasonTitle) fd.append("seasonTitle", episode.seasonTitle);
    fd.append("episodeNumber", episode.episodeNumber);
    fd.append("title", episode.title);
    if (episode.description) fd.append("description", episode.description);
    if (episode.duration) fd.append("duration", episode.duration);

    setEpStatus("uploading");
    setEpMessage(undefined);
    setEpPercent(0);

    const res = await uploadWithProgress(
      "/api/upload/episode",
      fd,
      setEpPercent,
    );
    if (res.ok && res.body?.success) {
      setEpStatus("success");
      setEpMessage(
        `Uploaded S${episode.seasonNumber}E${episode.episodeNumber}: "${episode.title}".`,
      );
      // Advance to the next episode number for convenience.
      updateEpisode({
        episodeNumber: String(Number(episode.episodeNumber) + 1),
        title: "",
        description: "",
        duration: "",
      });
      setEpisodeFile(null);
    } else {
      setEpStatus("error");
      setEpMessage(res.body?.error ?? `Upload failed (HTTP ${res.status}).`);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
          Create Web Series
        </h2>
        <form
          onSubmit={handleCreateSeries}
          className="bg-[#1f1f1f] p-4 md:p-8 rounded-lg space-y-5"
        >
          <div>
            <label className={labelClass}>Series Title</label>
            <input
              type="text"
              value={series.title}
              onChange={(e) => updateSeries({ title: e.target.value })}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={series.description}
              onChange={(e) => updateSeries({ description: e.target.value })}
              className={`${inputClass} h-24`}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Genre</label>
              <input
                type="text"
                value={series.genre}
                onChange={(e) => updateSeries({ genre: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <input
                type="number"
                value={series.year}
                onChange={(e) => updateSeries({ year: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Director</label>
              <input
                type="text"
                value={series.director}
                onChange={(e) => updateSeries({ director: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Cast (comma-separated)</label>
              <input
                type="text"
                value={series.cast}
                onChange={(e) => updateSeries({ cast: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Rating (0–10)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={series.rating}
                onChange={(e) => updateSeries({ rating: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Poster URL</label>
            <input
              type="url"
              value={series.poster}
              onChange={(e) => updateSeries({ poster: e.target.value })}
              className={inputClass}
              placeholder="https://…/poster.jpg"
              required
            />
          </div>
          <div>
            <label className={labelClass}>Background URL (optional)</label>
            <input
              type="url"
              value={series.background}
              onChange={(e) => updateSeries({ background: e.target.value })}
              className={inputClass}
              placeholder="https://…/bg.jpg"
            />
          </div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={series.premium}
              onChange={(e) => updateSeries({ premium: e.target.checked })}
              className="w-5 h-5 accent-[#E50914]"
            />
            <span className="text-gray-300">Premium series</span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={createStatus === "uploading"}
              className="px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] disabled:opacity-50"
            >
              Create Series
            </button>
            <StatusBadge status={createStatus} message={createMessage} />
          </div>
        </form>
      </div>

      {/* Episode upload */}
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
          Add Episode
        </h3>
        <form
          onSubmit={handleUploadEpisode}
          className="bg-[#1f1f1f] p-4 md:p-8 rounded-lg space-y-5"
        >
          <div>
            <label className={labelClass}>Series ID</label>
            <input
              type="text"
              value={seriesId}
              onChange={(e) => setSeriesId(e.target.value)}
              className={inputClass}
              placeholder="Auto-filled after creating a series"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Season Number</label>
              <input
                type="number"
                min="1"
                value={episode.seasonNumber}
                onChange={(e) => updateEpisode({ seasonNumber: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Season Title (optional)</label>
              <input
                type="text"
                value={episode.seasonTitle}
                onChange={(e) => updateEpisode({ seasonTitle: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Episode Number</label>
              <input
                type="number"
                min="1"
                value={episode.episodeNumber}
                onChange={(e) => updateEpisode({ episodeNumber: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Duration (optional)</label>
              <input
                type="text"
                value={episode.duration}
                onChange={(e) => updateEpisode({ duration: e.target.value })}
                className={inputClass}
                placeholder="48m"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Episode Title</label>
            <input
              type="text"
              value={episode.title}
              onChange={(e) => updateEpisode({ title: e.target.value })}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Episode Description (optional)</label>
            <textarea
              value={episode.description}
              onChange={(e) => updateEpisode({ description: e.target.value })}
              className={`${inputClass} h-20`}
            />
          </div>
          <div>
            <label className={labelClass}>
              Episode Video File (thumbnail auto-generated)
            </label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setEpisodeFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#E50914] file:text-white file:font-bold hover:file:bg-[#F40612]"
            />
            {episodeFile && (
              <p className="text-gray-500 text-sm mt-2">{episodeFile.name}</p>
            )}
          </div>
          {epStatus === "uploading" && (
            <div className="space-y-2">
              <ProgressBar percent={epPercent} />
              <p className="text-sm text-gray-400">{epPercent}%</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={epStatus === "uploading"}
              className="px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] disabled:opacity-50"
            >
              {epStatus === "uploading" ? "Uploading…" : "Upload Episode"}
            </button>
            <StatusBadge status={epStatus} message={epMessage} />
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bulk upload                                                        */
/* ------------------------------------------------------------------ */

interface FileProgress {
  name: string;
  percent: number;
  status: UploadStatus;
  message?: string;
}

function BulkUploadView() {
  const [mode, setMode] = useState<"json" | "csv">("json");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string>();
  const [rowResults, setRowResults] = useState<
    { createdCount: number; failedCount: number; errors: { index: number; error: string }[] } | null
  >(null);

  // Multi-file video upload with per-file progress (each file -> /api/upload/movie).
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);

  const handleBulkMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setStatus("error");
      setMessage("Paste JSON or CSV metadata first.");
      return;
    }
    setStatus("uploading");
    setMessage(undefined);
    setRowResults(null);

    const headers: Record<string, string> = {};
    let body: string;
    if (mode === "json") {
      headers["Content-Type"] = "application/json";
      // Accept either a bare array or an { items: [...] } object.
      try {
        const parsed = JSON.parse(text);
        body = JSON.stringify(
          Array.isArray(parsed) ? { items: parsed } : parsed,
        );
      } catch {
        setStatus("error");
        setMessage("Invalid JSON.");
        return;
      }
    } else {
      headers["Content-Type"] = "text/csv";
      body = text;
    }

    const res = await fetch("/api/upload/bulk", { method: "POST", headers, body });
    const resBody = await res.json().catch(() => null);
    if (resBody?.success && resBody.data) {
      setStatus(resBody.data.createdCount > 0 ? "success" : "error");
      setRowResults(resBody.data);
      setMessage(
        `Created ${resBody.data.createdCount}, failed ${resBody.data.failedCount}.`,
      );
    } else {
      setStatus("error");
      setMessage(resBody?.error ?? `Failed (HTTP ${res.status}).`);
    }
  };

  const handleMultiVideoUpload = async () => {
    if (videoFiles.length === 0) return;

    // Seed progress rows.
    setFileProgress(
      videoFiles.map((f) => ({ name: f.name, percent: 0, status: "uploading" })),
    );

    // Upload sequentially so progress is readable and the server isn't flooded.
    for (let i = 0; i < videoFiles.length; i += 1) {
      const file = videoFiles[i];
      const fd = new FormData();
      fd.append("video", file);
      // Derive minimal metadata from the file name; admins can edit later.
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      fd.append("title", baseName);
      fd.append("description", `Uploaded: ${baseName}`);
      fd.append("genre", "Uncategorized");
      fd.append("year", String(new Date().getFullYear()));
      fd.append("duration", "0m");
      fd.append("director", "Unknown");

      // eslint-disable-next-line no-await-in-loop
      const res = await uploadWithProgress("/api/upload/movie", fd, (p) => {
        setFileProgress((prev) =>
          prev.map((row, idx) => (idx === i ? { ...row, percent: p } : row)),
        );
      });
      setFileProgress((prev) =>
        prev.map((row, idx) =>
          idx === i
            ? {
                ...row,
                percent: 100,
                status: res.ok && res.body?.success ? "success" : "error",
                message:
                  res.ok && res.body?.success
                    ? "Done"
                    : res.body?.error ?? `HTTP ${res.status}`,
              }
            : row,
        ),
      );
    }
  };

  const jsonExample = `[
  {
    "title": "Big Buck Bunny",
    "description": "Free-licensed sample film.",
    "poster": "https://example.com/bbb-poster.jpg",
    "background": "https://example.com/bbb-bg.jpg",
    "videoUrl": "https://example.com/bbb.mp4",
    "rating": 8,
    "year": 2008,
    "duration": "10m",
    "genre": "Animation",
    "cast": "Blender Foundation",
    "director": "Sacha Goedegebure",
    "premium": false
  }
]`;
  const csvExample =
    "title,description,poster,background,videoUrl,rating,year,duration,genre,cast,director,premium\n" +
    "Big Buck Bunny,Free sample,https://ex.com/p.jpg,https://ex.com/b.jpg,https://ex.com/v.mp4,8,2008,10m,Animation,Blender|Foundation,Sacha,false";

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          Bulk Upload Metadata
        </h2>
        <p className="text-gray-400 mb-6 text-sm">
          Create many titles at once from metadata rows that reference hosted
          video URLs. Array fields (cast, genres) may be pipe- or comma-separated
          in CSV.
        </p>

        <div className="flex gap-2 mb-4">
          {(["json", "csv"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded font-semibold ${
                mode === m
                  ? "bg-[#E50914] text-white"
                  : "bg-[#2a2a2a] text-gray-400 hover:text-white"
              }`}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <form onSubmit={handleBulkMetadata} className="bg-[#1f1f1f] p-4 md:p-8 rounded-lg space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${inputClass} h-56 font-mono text-sm`}
            placeholder={mode === "json" ? jsonExample : csvExample}
          />
          <button
            type="button"
            onClick={() => setText(mode === "json" ? jsonExample : csvExample)}
            className="text-sm text-gray-400 hover:text-white underline"
          >
            Insert example {mode.toUpperCase()}
          </button>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={status === "uploading"}
              className="px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] disabled:opacity-50"
            >
              {status === "uploading" ? "Importing…" : "Import Rows"}
            </button>
            <StatusBadge status={status} message={message} />
          </div>

          {rowResults && rowResults.errors.length > 0 && (
            <div className="mt-4 bg-[#2a1414] border border-red-900 rounded p-4">
              <p className="text-red-300 font-semibold mb-2">Row errors</p>
              <ul className="text-sm text-red-200 space-y-1">
                {rowResults.errors.map((err) => (
                  <li key={err.index}>
                    Row {err.index + 1}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>

      {/* Multi-file video upload */}
      <div>
        <h3 className="text-xl md:text-2xl font-bold text-white mb-4">
          Bulk Video Upload (multi-file)
        </h3>
        <div className="bg-[#1f1f1f] p-4 md:p-8 rounded-lg space-y-4">
          <p className="text-sm text-gray-400">
            Select multiple video files — each is uploaded as a movie (thumbnail
            auto-generated) with metadata derived from the file name. Edit
            details afterwards in Manage.
          </p>
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={(e) => setVideoFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#E50914] file:text-white file:font-bold hover:file:bg-[#F40612]"
          />
          <button
            type="button"
            onClick={handleMultiVideoUpload}
            disabled={videoFiles.length === 0}
            className="px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] disabled:opacity-50"
          >
            Upload {videoFiles.length > 0 ? `${videoFiles.length} File(s)` : "Files"}
          </button>

          {fileProgress.length > 0 && (
            <div className="space-y-3 mt-4">
              {fileProgress.map((fp, idx) => (
                <div key={`${fp.name}-${idx}`} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300 truncate mr-3">{fp.name}</span>
                    <StatusBadge status={fp.status} message={fp.message} />
                  </div>
                  <ProgressBar percent={fp.percent} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
