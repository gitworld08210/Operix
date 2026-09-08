import assert from "node:assert/strict";
import { test } from "node:test";

import { mapRentalObject, type RawRentalObject } from "./mapRental.ts";

/**
 * Offline unit tests for the pure `_id -> id` rental mapping. Uses only Node
 * built-ins and imports `mapRentalObject`, which has no runtime dependency on
 * mongoose/next (its only import is a type-only `@/types`, erased at runtime).
 *
 * Run with:
 *   unset NODE_OPTIONS && node --experimental-strip-types --test \
 *     src/services/mongodb/mapRental.test.ts
 */

const baseRaw = (): RawRentalObject => ({
  _id: "507f1f77bcf86cd799439011",
  userId: "64b7f0c2e1a2b3c4d5e6f7a8",
  contentType: "movie",
  contentId: "movie-123",
  unlockedAt: "2024-01-15T10:00:00Z",
  expiresAt: "2024-01-15T11:00:00Z",
  createdAt: "2024-01-15T10:00:00Z",
});

test("maps _id and userId to string id/userId", () => {
  const result = mapRentalObject(baseRaw());
  assert.equal(result.id, "507f1f77bcf86cd799439011");
  assert.equal(result.userId, "64b7f0c2e1a2b3c4d5e6f7a8");
  assert.equal(typeof result.id, "string");
});

test("coerces an ObjectId-like _id/userId to string", () => {
  const raw = baseRaw();
  raw._id = { toString: () => "abc123" };
  raw.userId = { toString: () => "user9" } as unknown as string;
  const result = mapRentalObject(raw);
  assert.equal(result.id, "abc123");
  assert.equal(result.userId, "user9");
});

test("serialises Date timestamps to ISO strings", () => {
  const raw = baseRaw();
  raw.unlockedAt = new Date("2024-01-15T10:00:00.000Z");
  raw.expiresAt = new Date("2024-01-15T11:00:00.000Z");
  raw.createdAt = new Date("2024-01-15T10:00:00.000Z");
  const result = mapRentalObject(raw);
  assert.equal(result.unlockedAt, "2024-01-15T10:00:00.000Z");
  assert.equal(result.expiresAt, "2024-01-15T11:00:00.000Z");
  assert.equal(result.createdAt, "2024-01-15T10:00:00.000Z");
});

test("passes string timestamps through unchanged", () => {
  const result = mapRentalObject(baseRaw());
  assert.equal(result.expiresAt, "2024-01-15T11:00:00Z");
});

test("defaults an unknown contentType to movie", () => {
  const raw = baseRaw();
  raw.contentType = "bogus";
  const result = mapRentalObject(raw);
  assert.equal(result.contentType, "movie");
});

test("carries episode location fields for episode rentals", () => {
  const raw = baseRaw();
  raw.contentType = "episode";
  raw.contentId = "series-7:s1:e2";
  raw.seriesId = "series-7";
  raw.seasonNumber = 1;
  raw.episodeNumber = 2;
  const result = mapRentalObject(raw);
  assert.equal(result.contentType, "episode");
  assert.equal(result.seriesId, "series-7");
  assert.equal(result.seasonNumber, 1);
  assert.equal(result.episodeNumber, 2);
  assert.equal(result.contentId, "series-7:s1:e2");
});
