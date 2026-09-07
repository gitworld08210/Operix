"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useUser();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Mock registration - replace with actual API call
      // const response = await fetch("/api/auth/register", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify(formData),
      // });

      // const data = await response.json();

      // For demo, create a mock user
      const mockUser = {
        id: "1",
        email: formData.email,
        name: formData.name,
        isPremium: false,
        createdAt: new Date().toISOString(),
      };

      login(mockUser);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError("Failed to register. Please try again.");
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

        {/* Register Form */}
        <div className="bg-[#1f1f1f] rounded-lg p-8 md:p-10">
          <h2 className="text-3xl font-bold text-white mb-6">Sign Up</h2>

          {error && (
            <div className="mb-6 px-4 py-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors"
                placeholder="Enter your name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email or phone number
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
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
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors"
                placeholder="Create a password"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors"
                placeholder="Confirm your password"
              />
            </div>

            {/* Terms */}
            <div className="flex items-start space-x-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 text-[#E50914] rounded border-gray-600 focus:ring-[#E50914]"
                required
              />
              <span className="text-gray-400">
                This page is protected by Google reCAPTCHA to ensure you're not a bot.
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-8">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-[#E50914] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
