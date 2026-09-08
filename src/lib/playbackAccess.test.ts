import assert from "node:assert/strict";
import { test } from "node:test";

import {
  blobNameFromUrl,
  buildContentId,
  hasActiveRental,
  hasValidPremium,
  isUnlocked,
  MAX_SAS_WINDOW_MS,
  PREMIUM_SAS_WINDOW_MS,
  remainingMs,
  sasExpiryMinutesFor,
} from "./playbackAccess.ts";

/**
 * Offline unit tests for the pure playback-access logic. These cover the ONE
 * source of truth shared by the unlock and playback routes: the premium-vs-
 * rental authorisation, the remaining-window sizing that bounds a minted SAS,
 * the composite content-id key, and blob-name extraction from a stored URL.
 *
 * Run with:
 *   unset NODE_OPTIONS && node --experimental-strip-types --test \
 *     src/lib/playbackAccess.test.ts
 */

const NOW = new Date("2024-01-15T12:00:00.000Z");
const inOneHour = new Date(NOW.getTime() + 60 * 60 * 1000);
const anHourAgo = new Date(NOW.getTime() - 60 * 60 * 1000);

// --- hasValidPremium ---------------------------------------------------------

test("hasValidPremium: false when not flagged premium", () => {
  assert.equal(hasValidPremium(false, undefined, NOW), false);
});

test("hasValidPremium: true when premium with no expiry", () => {
  assert.equal(hasValidPremium(true, undefined, NOW), true);
});

test("hasValidPremium: true when premium and expiry is in the future", () => {
  assert.equal(hasValidPremium(true, inOneHour, NOW), true);
});

test("hasValidPremium: false when premium but expiry has passed", () => {
  assert.equal(hasValidPremium(true, anHourAgo, NOW), false);
});

// --- hasActiveRental ---------------------------------------------------------

test("hasActiveRental: false for null/undefined rental", () => {
  assert.equal(hasActiveRental(null, NOW), false);
  assert.equal(hasActiveRental(undefined, NOW), false);
});

test("hasActiveRental: true when expiresAt is in the future", () => {
  assert.equal(hasActiveRental({ expiresAt: inOneHour }, NOW), true);
});

test("hasActiveRental: false when expiresAt has passed", () => {
  assert.equal(hasActiveRental({ expiresAt: anHourAgo }, NOW), false);
});

// --- isUnlocked (the shared source of truth) --------------------------------

test("isUnlocked: valid premium unlocks without any rental", () => {
  assert.equal(
    isUnlocked({ isPremium: true, activeRental: null, now: NOW }),
    true,
  );
});

test("isUnlocked: lapsed premium with active rental still unlocked", () => {
  assert.equal(
    isUnlocked({
      isPremium: true,
      premiumExpiry: anHourAgo,
      activeRental: { expiresAt: inOneHour },
      now: NOW,
    }),
    true,
  );
});

test("isUnlocked: non-premium with active rental is unlocked", () => {
  assert.equal(
    isUnlocked({
      isPremium: false,
      activeRental: { expiresAt: inOneHour },
      now: NOW,
    }),
    true,
  );
});

test("isUnlocked: non-premium with expired rental is locked", () => {
  assert.equal(
    isUnlocked({
      isPremium: false,
      activeRental: { expiresAt: anHourAgo },
      now: NOW,
    }),
    false,
  );
});

test("isUnlocked: non-premium with no rental is locked", () => {
  assert.equal(
    isUnlocked({ isPremium: false, activeRental: null, now: NOW }),
    false,
  );
});

// --- remainingMs -------------------------------------------------------------

test("remainingMs: returns the gap to a future expiry", () => {
  assert.equal(remainingMs(inOneHour, NOW), 60 * 60 * 1000);
});

test("remainingMs: floors at 0 for a past expiry", () => {
  assert.equal(remainingMs(anHourAgo, NOW), 0);
});

// --- sasExpiryMinutesFor -----------------------------------------------------

test("sasExpiryMinutesFor: premium gets the fixed premium window", () => {
  const minutes = sasExpiryMinutesFor({ isPremium: true, now: NOW });
  assert.equal(minutes, PREMIUM_SAS_WINDOW_MS / (60 * 1000));
});

test("sasExpiryMinutesFor: rental gets the remaining minutes, rounded up", () => {
  const rentalExpiresAt = new Date(NOW.getTime() + 42.3 * 60 * 1000);
  const minutes = sasExpiryMinutesFor({
    isPremium: false,
    rentalExpiresAt,
    now: NOW,
  });
  assert.equal(minutes, 43);
});

test("sasExpiryMinutesFor: rental window is capped at MAX_SAS_WINDOW_MS", () => {
  const rentalExpiresAt = new Date(NOW.getTime() + 5 * 60 * 60 * 1000);
  const minutes = sasExpiryMinutesFor({
    isPremium: false,
    rentalExpiresAt,
    now: NOW,
  });
  assert.equal(minutes, MAX_SAS_WINDOW_MS / (60 * 1000));
});

test("sasExpiryMinutesFor: never returns less than 1 minute", () => {
  const rentalExpiresAt = new Date(NOW.getTime() + 1000); // 1 second left
  const minutes = sasExpiryMinutesFor({
    isPremium: false,
    rentalExpiresAt,
    now: NOW,
  });
  assert.equal(minutes, 1);
});

test("sasExpiryMinutesFor: no premium and no rental yields the 1-minute floor", () => {
  const minutes = sasExpiryMinutesFor({ isPremium: false, now: NOW });
  assert.equal(minutes, 1);
});

// --- buildContentId ----------------------------------------------------------

test("buildContentId: movie key is the id verbatim", () => {
  assert.equal(
    buildContentId({ contentType: "movie", contentId: "movie-123" }),
    "movie-123",
  );
});

test("buildContentId: episode key is the seriesId:s:e composite", () => {
  assert.equal(
    buildContentId({
      contentType: "episode",
      contentId: "series-7",
      seasonNumber: 2,
      episodeNumber: 5,
    }),
    "series-7:s2:e5",
  );
});

// --- blobNameFromUrl ---------------------------------------------------------

test("blobNameFromUrl: extracts the blob path after the container", () => {
  const url =
    "https://acct.blob.core.windows.net/ott-content/movies/1700000000-my-film.mp4";
  assert.equal(
    blobNameFromUrl(url, "ott-content"),
    "movies/1700000000-my-film.mp4",
  );
});

test("blobNameFromUrl: strips an existing query string / SAS", () => {
  const url =
    "https://acct.blob.core.windows.net/ott-content/movies/a.mp4?sv=2021&sig=abc";
  assert.equal(blobNameFromUrl(url, "ott-content"), "movies/a.mp4");
});

test("blobNameFromUrl: URL-decodes encoded path segments", () => {
  const url =
    "https://acct.blob.core.windows.net/ott-content/movies/My%20Film.mp4";
  assert.equal(blobNameFromUrl(url, "ott-content"), "movies/My Film.mp4");
});

test("blobNameFromUrl: returns null for a container-only URL", () => {
  const url = "https://acct.blob.core.windows.net/ott-content";
  assert.equal(blobNameFromUrl(url, "ott-content"), null);
});

test("blobNameFromUrl: returns null for a non-URL string", () => {
  assert.equal(blobNameFromUrl("not a url", "ott-content"), null);
  assert.equal(blobNameFromUrl("", "ott-content"), null);
});
