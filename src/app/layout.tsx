import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { UserProvider } from "@/contexts/UserContext";
import { MovieProvider } from "@/contexts/MovieContext";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
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
