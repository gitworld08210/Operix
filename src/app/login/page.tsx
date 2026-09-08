"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { login } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setSubmitting(true);

    // The server is the authority here: it verifies the password against the
    // stored scrypt hash and sets the httpOnly session cookie. On failure it
    // returns one generic message on purpose, so we simply surface it.
    const result = await login(email, password);

    if (!result.success) {
      setError(result.error ?? "Failed to sign in. Please try again.");
      setSubmitting(false);
      return;
    }

    // Admins land in the admin panel; everyone else on the home page.
    router.push(result.user?.role === "admin" ? "/admin" : "/");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center px-4 pt-20 pb-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <Link href="/" className="text-4xl font-bold text-[#E50914]">
            OTT<span className="text-white">PLAY</span>
          </Link>
        </div>

        {/* Login Form */}
        <div className="bg-[#1f1f1f] rounded-lg p-8 md:p-10">
          <h2 className="text-3xl font-bold text-white mb-6">Sign In</h2>

          {error && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors disabled:opacity-60"
                placeholder="Enter your email"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors disabled:opacity-60"
                placeholder="Enter your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Signing In…" : "Sign In"}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            <p className="text-gray-400 text-sm">
              New to OTT Platform?{" "}
              <Link href="/register" className="text-[#E50914] hover:underline">
                Sign up now
              </Link>
            </p>

            {/* Admin entry point — administrators sign in separately. */}
            <div className="pt-6 border-t border-[#2a2a2a]">
              <p className="text-sm text-gray-500">
                Are you an administrator?{" "}
                <Link href="/admin/login" className="text-gray-300 hover:underline">
                  Admin sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
