"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { register } = useUser();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side checks are a convenience for fast feedback only — the server
    // re-validates all of this, and the server's answer is what counts.
    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setSubmitting(true);

    const result = await register(formData);

    if (!result.success) {
      setError(result.error ?? "Failed to create your account. Please try again.");
      setSubmitting(false);
      return;
    }

    // Registration signs the new account in, so go straight to the catalog.
    router.push("/");
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

        {/* Register Form */}
        <div className="bg-[#1f1f1f] rounded-lg p-8 md:p-10">
          <h2 className="text-3xl font-bold text-white mb-6">Sign Up</h2>

          {error && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm"
            >
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
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                disabled={submitting}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors disabled:opacity-60"
                placeholder="Enter your name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
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
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                disabled={submitting}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors disabled:opacity-60"
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={submitting}
                className="w-full px-4 py-3 bg-[#333333] border border-transparent focus:border-[#E50914] text-white rounded focus:ring-0 placeholder-gray-500 transition-colors disabled:opacity-60"
                placeholder="Confirm your password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-[#E50914] text-white font-bold rounded hover:bg-[#F40612] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Creating Account…" : "Sign Up"}
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
