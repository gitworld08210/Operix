/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: We deploy to Azure App Service as a plain Next.js app. App Service's
  // Oryx build runs `npm install` + `npm run build`, then starts the app with
  // `npm start` (`next start`). Using `output: 'standalone'` here would emit a
  // `.next/standalone/server.js` that `next start` does NOT launch, which left
  // the site stuck on "waiting for your content". So we intentionally do NOT
  // set `output: 'standalone'` for the App Service (code) deployment. (The
  // Dockerfile path, if used instead, relies on standalone — see Dockerfile.)
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
