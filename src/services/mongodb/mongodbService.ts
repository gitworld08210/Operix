import mongoose from "mongoose";

import { getMongoUri } from "@/lib/env";

/**
 * Cached connection stored on the global object so that hot reloads in
 * development reuse a single Mongo connection instead of opening a new one on
 * every module reload.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB, reusing a cached connection when available. The URI is
 * read lazily here (never at import time) so importing this module does not
 * require MONGODB_URI to be set.
 */
export const connectToDatabase = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    const mongoUri = getMongoUri();

    cached.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

// Disconnect from database
export const disconnectFromDatabase = async () => {
  if (cached.conn) {
    await cached.conn.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
};

export default connectToDatabase;
