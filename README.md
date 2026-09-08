# OTT Platform — Premium Movie & Web Series Streaming

A premium OTT (Over-The-Top) streaming platform built with **Next.js 14 (App
Router)**. The backend runs inside Next.js as App Router API routes, so a single
deployment ships both the web app and the API — there is no separate backend
server.

## Features

### For viewers
- **Premium, modern UI** for browsing movies and web series.
- **Catalog & search** for movies and series (with per-series episodes).
- **1-hour rental / unlock** — unlocking a title grants time-limited access.
- **Secure playback** — video is served from a **private** Azure Blob container
  via **short-lived SAS URLs**, minted only after the viewer is authorized.
- **Premium native video player** built on the browser's native `<video>`.

### For admins
- **Separate admin login** (distinct from normal user login).
- **Bulk upload** of movies and web series (episodes) for **licensed content
  only** — there is no scraping of external sources.
- **Admin dashboard** for managing the catalog.

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript 5**
- **Tailwind CSS** for styling
- **Zustand** for client state, **Axios** for HTTP
- **MongoDB via Mongoose** for data (users, movies, series, rentals)
- **Azure Blob Storage** for video files (private container + SAS playback)
- **Cloudinary** for automatic thumbnail generation
- **Custom `node:crypto` auth** — HMAC-signed session cookies for user and
  admin sessions (not Azure AD B2C, not NextAuth providers)

## Getting started

### Prerequisites
- Node.js 18+ (Node 20 LTS recommended)
- A MongoDB connection string (MongoDB Atlas or Azure Cosmos DB for MongoDB)
- An Azure Storage account (Blob) for video
- A Cloudinary account for thumbnails

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables — copy `.env.example` to `.env.local` and
   fill in real values (`.env.local` is gitignored, never commit secrets):
   ```bash
   cp .env.example .env.local
   ```
   Key variables: `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_ACCOUNT_NAME`,
   `AZURE_STORAGE_CONTAINER`, `CLOUDINARY_*`, `MONGODB_URI`, `NEXTAUTH_SECRET`
   (generate with `openssl rand -base64 32`), `NEXTAUTH_URL`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`, `ADMIN_API_TOKEN`. See `.env.example` for the full,
   annotated list.

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Scripts
- `npm run dev` — start the dev server
- `npm run build` — production build (emits a standalone server)
- `npm run start` — run the production build
- `npm run lint` — lint
- `npm run test:unit` — run the unit test suite

## Project structure

```
ott-platform/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/           # Admin dashboard + admin login
│   │   ├── api/             # Backend API routes (the backend)
│   │   │   ├── auth/        # register, login, admin login, logout, me
│   │   │   ├── movies/      # movie list/detail/search + write endpoints
│   │   │   ├── series/      # series list/detail/search
│   │   │   ├── unlock/      # rental unlock + status
│   │   │   ├── playback/    # SAS-gated playback URLs (movie/episode)
│   │   │   └── upload/      # movie / episode / bulk upload
│   │   ├── login/           # user login
│   │   ├── register/        # user registration
│   │   ├── movie/ movies/   # movie detail + listing
│   │   └── premium/         # premium plans
│   ├── components/          # UI: hero, layout, movies, player, ui
│   ├── contexts/            # React context providers
│   ├── lib/                 # shared helpers
│   ├── models/              # Mongoose models
│   ├── services/            # azure, cloudinary, mongodb, upload, api
│   └── types/               # TypeScript types
├── Dockerfile               # multi-stage build (standalone output)
├── DEPLOYMENT.md            # Azure App Service deployment guide
├── next.config.js
└── package.json
```

## Security notes
- **Sessions** are HMAC-signed with `NEXTAUTH_SECRET`; auth fails closed when it
  is unset (no predictable default).
- **Video** stays in a private Blob container; playback URLs are short-lived SAS
  tokens issued only to authorized viewers. Do not make the container public.
- **Write/upload APIs** require an admin session or the `ADMIN_API_TOKEN`
  (`x-admin-token` header).

## Deployment

The app deploys to **Azure App Service** (Linux, Node 20 LTS) either as code
(standalone output) or as a container. It must run on the **Node.js runtime**
(not Edge) and is not statically exportable. A GitHub Actions workflow
(`.github/workflows/azure-deploy.yml`) builds and deploys on push to `main`.

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide.

## License

MIT
