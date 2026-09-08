import assert from "node:assert/strict";
import { test } from "node:test";

import { mapMovieObject, type RawMovieObject } from "./mapMovie.ts";

/**
 * Offline unit tests for the pure `_id -> id` movie mapping. These use only
 * Node built-ins (node:test + node:assert) and import `mapMovieObject`, which
 * has no runtime dependency on mongoose/next/etc. (its only import is a
 * type-only `@/types`, erased at runtime).
 *
 * Run with a TypeScript-capable Node (>= 22.6):
 *   unset NODE_OPTIONS && node --experimental-strip-types --test \
 *     src/services/mongodb/mapMovie.test.ts
 *
 * NOTE: The zod validation schemas (src/lib/validation.ts) and the repository's
 * DB functions are NOT unit-tested here because they transitively import
 * uninstallable modules (zod / mongoose) that cannot be resolved in this
 * package-registry-less sandbox. Their pure-logic behaviour is instead covered
 * by extracting testable pieces (this mapping) and by tsc type-checking; full
 * runtime tests for them are deferred until node_modules can be installed.
 */

const baseRaw = (): RawMovieObject => ({
  _id: "507f1f77bcf86cd799439011",
  title: "Interstellar",
  description: "Space exploration epic.",
  poster: "https://cdn.example.com/interstellar/poster.jpg",
  background: "https://cdn.example.com/interstellar/bg.jpg",
  videoUrl: "https://cdn.example.com/interstellar/video.mp4",
  rating: 9.4,
  year: 2014,
  duration: "2h 49m",
  genre: "Sci-Fi",
  director: "Christopher Nolan",
  premium: true,
  views: 0,
  downloadCount: 0,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
});

test("maps _id to a string id", () => {
  const result = mapMovieObject(baseRaw());
  assert.equal(result.id, "507f1f77bcf86cd799439011");
  assert.equal(typeof result.id, "string");
});

test("coerces a non-string _id (e.g. ObjectId) to string", () => {
  const raw = baseRaw();
  // Simulate an ObjectId-like value whose toString yields the hex id.
  raw._id = { toString: () => "abc123" };
  const result = mapMovieObject(raw);
  assert.equal(result.id, "abc123");
});

test("defaults a missing cast to an empty array", () => {
  const result = mapMovieObject(baseRaw());
  assert.deepEqual(result.cast, []);
});

test("preserves a provided cast array", () => {
  const raw = baseRaw();
  raw.cast = ["Matthew McConaughey", "Anne Hathaway"];
  const result = mapMovieObject(raw);
  assert.deepEqual(result.cast, ["Matthew McConaughey", "Anne Hathaway"]);
});

test("serialises Date timestamps to ISO strings", () => {
  const raw = baseRaw();
  raw.createdAt = new Date("2024-01-15T10:00:00.000Z");
  raw.updatedAt = new Date("2024-02-20T08:30:00.000Z");
  const result = mapMovieObject(raw);
  assert.equal(result.createdAt, "2024-01-15T10:00:00.000Z");
  assert.equal(result.updatedAt, "2024-02-20T08:30:00.000Z");
});

test("passes string timestamps through unchanged", () => {
  const raw = baseRaw();
  raw.createdAt = "2024-01-15T10:00:00Z";
  raw.updatedAt = "2024-01-15T10:00:00Z";
  const result = mapMovieObject(raw);
  assert.equal(result.createdAt, "2024-01-15T10:00:00Z");
  assert.equal(result.updatedAt, "2024-01-15T10:00:00Z");
});

test("carries scalar fields through faithfully", () => {
  const result = mapMovieObject(baseRaw());
  assert.equal(result.title, "Interstellar");
  assert.equal(result.rating, 9.4);
  assert.equal(result.year, 2014);
  assert.equal(result.genre, "Sci-Fi");
  assert.equal(result.premium, true);
});
