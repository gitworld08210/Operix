/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server at `.next/standalone/server.js`. On Azure App
  // Service (Linux, Node) this `server.js` binds to the injected `PORT` and is
  // launched directly (`node server.js`), which works reliably WITHOUT needing
  // a Portal "Startup Command". The CI workflow assembles the standalone output
  // (server.js at the deploy root + .next/static + public) and the start script
  // runs it. (`next start` was returning 503 because App Service had no startup
  // command configured to launch it.)
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
