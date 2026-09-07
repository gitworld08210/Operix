# OTT Platform - Premium Movie Streaming

A premium OTT (Over-The-Top) platform built with Next.js 14, featuring movie streaming, download functionality, premium subscriptions, and admin management.

## Features

### For Users
- **Premium UI**: Netflix-style modern interface
- **Movie Catalog**: Browse and search movies by genre
- **Video Player**: High-quality streaming with quality selector (480p to 4K)
- **Download**: Download movies for offline viewing (Premium only)
- **Premium Subscriptions**: 3 tiers (Basic, Standard, Premium)
- **Ad System**: Ads for free users, ad-free for premium members

### For Admin
- **Movie Upload**: Upload movies to your library
- **Bulk Scrape**: Scrape movie data from external sources
- **Content Management**: Manage movies, users, and subscriptions
- **Dashboard**: View stats and recent activity

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript**
- **Tailwind CSS**
- **Zustand** (State management)
- **Axios** (API calls)

### Backend & Storage
- **Azure Blob Storage** (Video files)
- **Cloudinary** (Thumbnails, images)
- **Azure Cosmos DB** (Database)
- **Azure AD B2C** (Authentication)

## Getting Started

### Prerequisites
- Node.js 18+ 
- Azure account
- Cloudinary account

### Installation

1. Clone the repository:
```bash
cd ott-platform
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Edit `.env.local` with your Azure and Cloudinary credentials:
```env
AZURE_STORAGE_CONNECTION_STRING=your_connection_string
AZURE_STORAGE_ACCOUNT_NAME=your_account_name
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MONGODB_URI=your_mongodb_uri
NEXTAUTH_SECRET=your_secret
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
ott-platform/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── admin/        # Admin dashboard
│   │   ├── login/        # User login
│   │   ├── register/     # User registration
│   │   ├── movie/        # Movie detail page
│   │   ├── movies/       # Movies listing
│   │   ├── premium/      # Premium plans
│   │   └── page.tsx      # Homepage
│   ├── components/       # React components
│   │   ├── hero/         # Hero section
│   │   ├── layout/       # Header, Footer, etc.
│   │   ├── movies/       # Movie cards, carousel
│   │   └── player/       # Video player
│   ├── contexts/         # Context providers
│   ├── types/            # TypeScript types
│   └── services/         # API services
├── package.json
├── next.config.js
└── tsconfig.json
```

## Next Steps

To complete the platform, implement the following API endpoints:
- User authentication (NextAuth with Azure AD B2C)
- Azure Blob Storage upload/download
- Cloudinary image management
- Cosmos DB database models
- Scraping service for bulk movie import

## License

MIT
