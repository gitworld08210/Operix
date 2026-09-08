"use client";

import { useUser } from "@/contexts/UserContext";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileMenu() {
  const { user, logout } = useUser();
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Movies", href: "/movies" },
    { name: "TV Series", href: "/series" },
    { name: "My List", href: "/my-list" },
    { name: "Premium", href: "/premium" },
  ];

  return (
    <div className="md:hidden bg-[#141414] border-t border-[#2a2a2a] px-4 py-6 space-y-4">
      {navLinks.map((link) => (
        <Link
          key={link.name}
          href={link.href}
          onClick={() => {
            // Close menu on navigation (optional)
          }}
          className={`block text-base font-medium ${
            pathname === link.href
              ? "text-[#E50914]"
              : "text-gray-300 hover:text-white"
          }`}
        >
          {link.name}
        </Link>
      ))}

      <div className="border-t border-[#2a2a2a] pt-4 space-y-4">
        {user ? (
          <>
            <Link
              href="/profile"
              className="block text-base text-gray-300 hover:text-white"
            >
              Profile
            </Link>
            {/* Convenience link only; /admin is gated server-side. */}
            {user.role === "admin" && (
              <Link
                href="/admin"
                className="block text-base font-bold text-[#E50914] hover:text-[#F40612]"
              >
                Admin Dashboard
              </Link>
            )}
            <button
              onClick={logout}
              className="block text-base text-red-500 hover:text-red-400"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="block text-base text-gray-300 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="block text-base text-[#E50914] hover:text-[#F40612]"
            >
              Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
