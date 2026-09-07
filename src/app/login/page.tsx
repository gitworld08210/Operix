"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      // Mock login - replace with actual API call
      // const response = await fetch("/api/auth/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ email, password }),
      // });

      // const data = await response.json();
      
      // For demo, create a mock user
      const mockUser = {
        id: "1",
        email,
        name: email.split("@")[0],
        isPremium: false,
        createdAt: new Date().toISOString(),
      };

      login(mockUser);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <div className="mb-6 px-4 py-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email or phone number
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Remember me</span>
              <Link href="/forgot-password" className="text-sm text-gray-400 hover:underline">
                Need help?
              </Link>
            </div>

            <p className="text-gray-400 text-sm">
              New to OTT Platform?{" "}
              <Link href="/register" className="text-[#E50914] hover:underline">
                Sign up now
              </Link>
            </p>

            {/* Mobile App Promo */}
            <div className="pt-6 border-t border-[#2a2a2a]">
              <p className="text-sm text-gray-400 mb-2">Download our app.</p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  App Store
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Google Play
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Amazon
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
