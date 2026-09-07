"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useRouter } from "next/navigation";
import { Movie } from "@/types";

interface ScrapedData {
  id: string;
  title: string;
  source: string;
  status: "pending" | "processed" | "failed";
  scrapedAt: string;
  movieId?: string;
}

export default function AdminDashboard() {
  const { user, logout } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"dashboard" | "upload" | "movies" | "scraped">("dashboard");

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Mock scraped data
  const [scrapedData, setScrapedData] = useState<ScrapedData[]>([
    { id: "1", title: "Interstellar (Scraped)", source: "hdhub4u.com", status: "pending", scrapedAt: "2024-01-15" },
    { id: "2", title: "The Dark Knight (Scraped)", source: "example.com", status: "processed", scrapedAt: "2024-01-14", movieId: "2" },
    { id: "3", title: "Inception (Scraped)", source: "example.com", status: "pending", scrapedAt: "2024-01-13" },
    { id: "4", title: "Pulp Fiction (Scraped)", source: "hdhub4u.com", status: "failed", scrapedAt: "2024-01-12" },
    { id: "5", title: "The Matrix (Scraped)", source: "example.com", status: "pending", scrapedAt: "2024-01-11" },
  ]);

  const handleBulkScrape = async () => {
    // Mock bulk scraping
    const newScrapedData: ScrapedData[] = [
      { id: "6", title: "New Movie 1 (Scraped)", source: "hdhub4u.com", status: "pending", scrapedAt: new Date().toISOString().split("T")[0] },
      { id: "7", title: "New Movie 2 (Scraped)", source: "example.com", status: "pending", scrapedAt: new Date().toISOString().split("T")[0] },
    ];
    setScrapedData([...scrapedData, ...newScrapedData]);
    alert("Bulk scraping started! Movies will be available shortly.");
  };

  const handleProcessScraped = async (id: string) => {
    // Mock processing
    setScrapedData(scrapedData.map(item => 
      item.id === id ? { ...item, status: "processed", movieId: (Math.random() * 100).toString() } : item
    ));
    alert(`Movie ${id} processed successfully!`);
  };

  const handleDeleteScraped = async (id: string) => {
    setScrapedData(scrapedData.filter(item => item.id !== id));
  };

  // Mock stats
  const stats = {
    totalMovies: 150,
    totalDownloads: 50000,
    premiumUsers: 5000,
    scrapedToday: 25,
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Admin Header */}
      <div className="bg-[#1f1f1f] border-b border-[#2a2a2a]">
        <div className="px-4 md:px-12 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Admin</span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-[#1f1f1f] border-r border-[#2a2a2a]">
          <nav className="px-4 py-6 space-y-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === "dashboard"
                  ? "bg-[#E50914] text-white"
                  : "text-gray-400 hover:bg-[#2a2a2a]"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === "upload"
                  ? "bg-[#E50914] text-white"
                  : "text-gray-400 hover:bg-[#2a2a2a]"
              }`}
            >
              Upload Movie
            </button>
            <button
              onClick={() => setActiveTab("movies")}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === "movies"
                  ? "bg-[#E50914] text-white"
                  : "text-gray-400 hover:bg-[#2a2a2a]"
              }`}
            >
              Manage Movies
            </button>
            <button
              onClick={() => setActiveTab("scraped")}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                activeTab === "scraped"
                  ? "bg-[#E50914] text-white"
                  : "text-gray-400 hover:bg-[#2a2a2a]"
              }`}
            >
              Scraped Data
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {activeTab === "dashboard" && (
            <DashboardView stats={stats} />
          )}
          {activeTab === "upload" && (
            <UploadMovieView />
          )}
          {activeTab === "movies" && (
            <ManageMoviesView />
          )}
          {activeTab === "scraped" && (
            <ScrapedDataView scrapedData={scrapedData} onProcess={handleProcessScraped} onDelete={handleDeleteScraped} onBulkScrape={handleBulkScrape} />
          )}
        </div>
      </div>
    </div>
  );
}

// Dashboard View
function DashboardView({ stats }: { stats: typeof stats }) {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white mb-6">Dashboard Overview</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Total Movies</p>
          <p className="text-4xl font-bold text-white">{stats.totalMovies}</p>
        </div>
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Total Downloads</p>
          <p className="text-4xl font-bold text-white">{stats.totalDownloads.toLocaleString()}</p>
        </div>
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Premium Users</p>
          <p className="text-4xl font-bold text-white">{stats.premiumUsers.toLocaleString()}</p>
        </div>
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Scraped Today</p>
          <p className="text-4xl font-bold text-white">{stats.scrapedToday}</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1f1f1f] p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-3 border-b border-[#2a2a2a]">
            <span className="text-gray-300">New premium user</span>
            <span className="text-gray-500 text-sm">2 hours ago</span>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-[#2a2a2a]">
            <span className="text-gray-300">5 movies uploaded</span>
            <span className="text-gray-500 text-sm">5 hours ago</span>
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-gray-300">Scraped 10 movies</span>
            <span className="text-gray-500 text-sm">8 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Upload Movie View
function UploadMovieView() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre: "",
    year: "",
    premium: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mock upload - replace with actual Azure Blob Storage upload
    console.log("Uploading movie:", formData);
    alert("Movie uploaded successfully!");
    setFormData({ title: "", description: "", genre: "", year: "", premium: false });
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-3xl font-bold text-white mb-6">Upload New Movie</h2>
      
      <form onSubmit={handleSubmit} className="bg-[#1f1f1f] p-8 rounded-lg space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Movie Title</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded"
            placeholder="Enter movie title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded h-32"
            placeholder="Enter movie description"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
            <input
              type="text"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded"
              placeholder="e.g., Action, Sci-Fi"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Year</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded"
              placeholder="2024"
              required
            />
          </div>
        </div>

        <div>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.premium}
              onChange={(e) => setFormData({ ...formData, premium: e.target.checked })}
              className="w-5 h-5 text-[#E50914] rounded border-gray-600 focus:ring-[#E50914]"
            />
            <span className="text-gray-300">This is premium content</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Video File</label>
          <div className="border-2 border-dashed border-[#333333] rounded-lg p-8 text-center">
            <p className="text-gray-400 mb-4">Drag and drop video file here, or click to browse</p>
            <input type="file" accept="video/*" className="hidden" />
            <button
              type="button"
              className="px-6 py-2 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612]"
            >
              Select File
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612]"
        >
          Upload Movie
        </button>
      </form>
    </div>
  );
}

// Manage Movies View
function ManageMoviesView() {
  const movies = [
    { id: "1", title: "Interstellar", views: 1500000, downloads: 45000, premium: true },
    { id: "2", title: "The Dark Knight", views: 2000000, downloads: 60000, premium: false },
    { id: "3", title: "Inception", views: 1800000, downloads: 55000, premium: true },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Manage Movies</h2>
        <button className="px-4 py-2 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612]">
          Add New Movie
        </button>
      </div>

      <div className="bg-[#1f1f1f] rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#2a2a2a]">
            <tr>
              <th className="px-6 py-4 text-gray-300 font-semibold">Title</th>
              <th className="px-6 py-4 text-gray-300 font-semibold">Views</th>
              <th className="px-6 py-4 text-gray-300 font-semibold">Downloads</th>
              <th className="px-6 py-4 text-gray-300 font-semibold">Premium</th>
              <th className="px-6 py-4 text-gray-300 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {movies.map((movie) => (
              <tr key={movie.id}>
                <td className="px-6 py-4 text-white font-medium">{movie.title}</td>
                <td className="px-6 py-4 text-gray-400">{movie.views.toLocaleString()}</td>
                <td className="px-6 py-4 text-gray-400">{movie.downloads.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${movie.premium ? "bg-yellow-900 text-yellow-300" : "bg-gray-700 text-gray-400"}`}>
                    {movie.premium ? "Premium" : "Free"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-gray-400 hover:text-white mr-4">Edit</button>
                  <button className="text-red-500 hover:text-red-400">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Scraped Data View
function ScrapedDataView({ scrapedData, onProcess, onDelete, onBulkScrape }: {
  scrapedData: ScrapedData[];
  onProcess: (id: string) => void;
  onDelete: (id: string) => void;
  onBulkScrape: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Scraped Data</h2>
        <button
          onClick={onBulkScrape}
          className="px-6 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612]"
        >
          Bulk Scrape
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Pending</p>
          <p className="text-3xl font-bold text-white">
            {scrapedData.filter(d => d.status === "pending").length}
          </p>
        </div>
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Processed</p>
          <p className="text-3xl font-bold text-green-500">
            {scrapedData.filter(d => d.status === "processed").length}
          </p>
        </div>
        <div className="bg-[#1f1f1f] p-6 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">Failed</p>
          <p className="text-3xl font-bold text-red-500">
            {scrapedData.filter(d => d.status === "failed").length}
          </p>
        </div>
      </div>

      <div className="bg-[#1f1f1f] rounded-lg overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#2a2a2a]">
            <tr>
              <th className="px-6 py-4 text-gray-300 font-semibold">Title</th>
              <th className="px-6 py-4 text-gray-300 font-semibold">Source</th>
              <th className="px-6 py-4 text-gray-300 font-semibold">Status</th>
              <th className="px-6 py-4 text-gray-300 font-semibold">Date</th>
              <th className="px-6 py-4 text-gray-300 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2a2a2a]">
            {scrapedData.map((data) => (
              <tr key={data.id}>
                <td className="px-6 py-4 text-white font-medium">{data.title}</td>
                <td className="px-6 py-4 text-gray-400">{data.source}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    data.status === "pending" ? "bg-yellow-900 text-yellow-300" :
                    data.status === "processed" ? "bg-green-900 text-green-300" :
                    "bg-red-900 text-red-300"
                  }`}>
                    {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400">{data.scrapedAt}</td>
                <td className="px-6 py-4">
                  {data.status === "pending" && (
                    <>
                      <button
                        onClick={() => onProcess(data.id)}
                        className="text-blue-500 hover:text-blue-400 mr-4"
                      >
                        Process
                      </button>
                      <button
                        onClick={() => onDelete(data.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {data.status === "processed" && (
                    <span className="text-green-500">Added to library</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
