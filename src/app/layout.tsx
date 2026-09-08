import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { UserProvider } from "@/contexts/UserContext";
import { MovieProvider } from "@/contexts/MovieContext";

// NOTE: We intentionally do NOT use `next/font/google` (Inter) here. That helper
// fetches the font from fonts.googleapis.com at BUILD time, which fails in
// locked-down CI (Azure/GitHub runners without outbound access) and broke the
// production build. A system-font stack (defined on <body> via Tailwind's
// font-sans / globals.css) needs zero network access, so the build is fully
// offline-safe and there is no runtime font dependency.

export const metadata: Metadata = {
  title: "OTT Platform - Watch & Download Movies",
  description: "Premium OTT platform with movies, series, and more",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <UserProvider>
          <MovieProvider>
            <Header />
            <main className="min-h-screen bg-[#141414] text-white">
              {children}
            </main>
            <Footer />
          </MovieProvider>
        </UserProvider>
      </body>
    </html>
  );
}
