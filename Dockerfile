# syntax=docker/dockerfile:1

# Multi-stage build for the Next.js (App Router) OTT platform.
# The backend runs INSIDE Next.js as App Router API routes, so this single
# image ships both the frontend and the API. Several routes rely on the
# Node.js runtime (node:crypto sessions, force-dynamic), so we run the
# standalone Node server — never a static export / Edge runtime.

# ---- Stage 1: install dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
# Only the manifests are needed to resolve the dependency tree, which keeps
# this layer cached across source-only changes.
COPY package.json package-lock.json* ./
RUN npm ci

# ---- Stage 2: build the standalone output ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `output: "standalone"` in next.config.js produces .next/standalone/server.js
# plus a trimmed node_modules. Static assets and public/ are copied separately.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Stage 3: minimal runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy the standalone server, static assets and public files.
# Ownership is set to the non-root user.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Azure App Service injects PORT / WEBSITES_PORT. The standalone server reads
# process.env.PORT; default to 8080 to match WEBSITES_PORT=8080.
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
EXPOSE 8080

# server.js is the entrypoint emitted by the standalone build; it binds to
# process.env.PORT || 3000, so PORT above pins it to 8080.
CMD ["node", "server.js"]
