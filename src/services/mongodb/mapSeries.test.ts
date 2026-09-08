import assert from "node:assert/strict";
import { test } from "node:test";

import { mapSeriesObject, type RawSeriesObject } from "./mapSeries.ts";

/**
 * Offline unit tests for the pure `_id -> id` series mapping and its nested
 * season/episode normalisation. These use only Node built-ins (node:test +
 * node:assert) and import `mapSeriesObject`, which has no runtime dependency on
 * mongoose/next/etc. (its only import is a type-only `@/types`, erased at
 * runtime).
 *
 * Run with a TypeScript-capable Node (>= 22.6):
 *   unset NODE_OPTIONS && node --experimental-strip-types --test \
 *     src/services/mongodb/mapSeries.test.ts
 */

const baseRaw = (): RawSeriesObject => ({
  _id: "507f1f77bcf86cd799439099",
  title: "Dark",
  description: "A time-travel mystery.",
  poster: "https://cdn.example.com/dark/poster.jpg",
  background: "https://cdn.example.com/dark/bg.jpg",
  rating: 8.7,
  year: 2017,
  genre: "Sci-Fi",
  director: "Baran bo Odar",
  premium: true,
  views: 0,
  seasons: [
    {
      seasonNumber: 1,
      title: "Season 1",
      episodes: [
        {
          episodeNumber: 2,
          title: "Lies",
          videoUrl: "https://cdn.example.com/dark/s1e2.mp4",
          blobName: "series/dark/s1e2.mp4",
        },
        {
          episodeNumber: 1,
          title: "Secrets",
          videoUrl: "https://cdn.example.com/dark/s1e1.mp4",
        },
      ],
    },
  ],
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
});

test("maps _id to a string id", () => {
  const result = mapSeriesObject(baseRaw());
  assert.equal(result.id, "507f1f77bcf86cd799439099");
  assert.equal(typeof result.id, "string");
});

test("coerces a non-string _id (e.g. ObjectId) to string", () => {
  const raw = baseRaw();
  raw._id = { toString: () => "abc123" };
  const result = mapSeriesObject(raw);
  assert.equal(result.id, "abc123");
});

test("defaults missing cast and seasons to empty arrays", () => {
  const raw = baseRaw();
  delete (raw as { cast?: string[] }).cast;
  delete (raw as { seasons?: unknown }).seasons;
  const result = mapSeriesObject(raw);
  assert.deepEqual(result.cast, []);
  assert.deepEqual(result.seasons, []);
});

test("sorts episodes within a season by episodeNumber", () => {
  const result = mapSeriesObject(baseRaw());
  const numbers = result.seasons[0].episodes.map((e) => e.episodeNumber);
  assert.deepEqual(numbers, [1, 2]);
});

test("sorts seasons by seasonNumber", () => {
  const raw = baseRaw();
  raw.seasons = [
    { seasonNumber: 3, episodes: [] },
    { seasonNumber: 1, episodes: [] },
    { seasonNumber: 2, episodes: [] },
  ];
  const result = mapSeriesObject(raw);
  assert.deepEqual(
    result.seasons.map((s) => s.seasonNumber),
    [1, 2, 3],
  );
});

test("carries per-episode fields through faithfully", () => {
  const result = mapSeriesObject(baseRaw());
  const ep1 = result.seasons[0].episodes[0];
  assert.equal(ep1.title, "Secrets");
  assert.equal(ep1.videoUrl, "https://cdn.example.com/dark/s1e1.mp4");
  const ep2 = result.seasons[0].episodes[1];
  assert.equal(ep2.blobName, "series/dark/s1e2.mp4");
});

test("serialises Date timestamps to ISO strings", () => {
  const raw = baseRaw();
  raw.createdAt = new Date("2024-01-15T10:00:00.000Z");
  raw.updatedAt = new Date("2024-02-20T08:30:00.000Z");
  const result = mapSeriesObject(raw);
  assert.equal(result.createdAt, "2024-01-15T10:00:00.000Z");
  assert.equal(result.updatedAt, "2024-02-20T08:30:00.000Z");
});

test("defaults empty episodes array when a season omits it", () => {
  const raw = baseRaw();
  raw.seasons = [{ seasonNumber: 1 }];
  const result = mapSeriesObject(raw);
  assert.deepEqual(result.seasons[0].episodes, []);
});
