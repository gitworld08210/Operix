"use client";

import { useUser } from "@/contexts/UserContext";
import Link from "next/link";
import { useState } from "react";
import MobileMenu from "./MobileMenu";

export default function Header() {
  const { user, logout } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Movies", href: "/movies" },
    { name: "TV Series", href: "/series" },
    { name: "My List", href: "/my-list" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#141414] transition-all duration-300">
      {/* Top Navigation */}
      <div className="flex items-center justify-between px-4 py-4 md:px-12">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-[#E50914]">
          OTT<span className="text-white">PLAY</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-sm text-gray-300 hover:text-white transition-colors"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Right Side Icons */}
        <div className="flex items-center space-x-6">
          <Link href="/search" className="text-gray-300 hover:text-white">
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
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </Link>

          {/* Premium Badge */}
          {user?.isPremium && (
            <span className="hidden md:block px-3 py-1 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-xs font-bold rounded">
              PREMIUM
            </span>
          )}

          {/* Admin shortcut — only for administrators. This is a convenience
              link, not a security boundary: /admin is gated server-side. */}
          {user?.role === "admin" && (
            <Link
              href="/admin"
              className="hidden md:block px-3 py-1 border border-[#E50914] text-[#E50914] text-xs font-bold rounded hover:bg-[#E50914] hover:text-white transition-colors"
            >
              ADMIN
            </Link>
          )}

          {/* User Menu */}
          {user ? (
            <div className="flex items-center space-x-4">
              <Link href="/profile" className="text-gray-300 hover:text-white">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Link>
              <button
                onClick={logout}
                className="text-sm text-gray-300 hover:text-white"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex space-x-4">
              <Link
                href="/login"
                className="text-sm text-gray-300 hover:text-white"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-[#E50914] text-white text-sm font-bold rounded hover:bg-[#F40612] transition-colors"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-300 hover:text-white"
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
                d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && <MobileMenu />}
    </header>
  );
}
