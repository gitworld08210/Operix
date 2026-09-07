/**
 * Lazy environment-config helpers.
 *
 * Every getter reads from `process.env` only when invoked and throws a clear
 * Error solely when a required value is missing. Nothing here reads env vars or
 * throws at module-import time, so importing this module never crashes a build
 * or a route that does not actually need a given service configured.
 */

/** Default Azure Blob container name when AZURE_STORAGE_CONTAINER is unset. */
export const DEFAULT_AZURE_CONTAINER = "ott-content";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** MongoDB connection string (MONGODB_URI). Throws if not configured. */
export function getMongoUri(): string {
  return requireEnv("MONGODB_URI");
}

/** Azure Blob Storage connection string. Throws if not configured. */
export function getAzureConnectionString(): string {
  return requireEnv("AZURE_STORAGE_CONNECTION_STRING");
}

/**
 * Azure Blob container name (AZURE_STORAGE_CONTAINER), defaulting to
 * `ott-content` when the variable is not set. Never throws.
 */
export function getAzureContainer(): string {
  return process.env.AZURE_STORAGE_CONTAINER || DEFAULT_AZURE_CONTAINER;
}

/**
 * Shared secret gating the movie write endpoints (POST/PUT/DELETE). Read lazily
 * from ADMIN_API_TOKEN and returns `undefined` when unset. Never throws — the
 * route handlers decide the fail-closed behaviour so an unset token yields 401
 * rather than crashing an import or a read-only request.
 */
export function getAdminApiToken(): string | undefined {
  return process.env.ADMIN_API_TOKEN;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Cloudinary credentials (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY /
 * CLOUDINARY_API_SECRET). Throws if any value is missing.
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  return {
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    apiSecret: requireEnv("CLOUDINARY_API_SECRET"),
  };
}
