/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained production build under `.next/standalone` (with its
  // own `server.js`) so the app can run on Azure App Service / in a container
  // without needing the full node_modules tree at runtime.
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

module.exports = nextConfig;
