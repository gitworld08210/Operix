"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

/**
 * Administrator sign-in — a separate door from the viewer login at /login.
 *
 * Posts to /api/auth/admin/login, which accepts either the env-configured
 * administrator (ADMIN_EMAIL / ADMIN_PASSWORD) or a database user whose role is
 * "admin", and issues a session cookie carrying role="admin".
 */
export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { loginAsAdmin } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both the admin email and password");
      return;
    }

    setSubmitting(true);

    const result = await loginAsAdmin(email, password);

    if (!result.success) {
      setError(result.error ?? "Sign in failed. Please try again.");
      setSubmitting(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="text-4xl font-bold text-[#E50914]">
            OTT<span className="text-white">PLAY</span>
          </Link>
          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-gray-500">
            Admin Console
          </p>
        </div>

        {/* Admin Login Form */}
        <div className="bg-[#1f1f1f] rounded-lg p-8 md:p-10 border border-[#2a2a2a]">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Sign In</h1>
          <p className="text-sm text-gray-400 mb-6">
            Restricted area. Use your administrator credentials — these are separate
            from a viewer account.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Admin Email */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Admin email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors disabled:opacity-60"
                placeholder="admin@example.com"
              />
            </div>

            {/* Admin Password */}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Admin password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors disabled:opacity-60"
                placeholder="Enter the admin password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing In…" : "Sign In to Admin Panel"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
            <p className="text-sm text-gray-400">
              Not an administrator?{" "}
              <Link href="/login" className="text-[#E50914] hover:underline">
                Viewer sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
