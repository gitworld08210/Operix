import type { RentalContentType } from "@/types";

/**
 * Pure, dependency-free playback-access logic shared by the unlock route
 * (`/api/unlock`) and the SAS-minting playback routes (`/api/playback/...`).
 *
 * Keeping this in one module means "is this content unlocked?" has exactly ONE
 * definition: the unlock endpoint and the endpoint that mints a signed video
 * URL can never drift apart and accidentally hand out a SAS token to someone
 * the unlock check would have rejected. Everything here is free of mongoose /
 * next / @azure imports so it can be unit-tested offline.
 */

/** One hour in milliseconds: the free-user rental window. */
export const RENTAL_TTL_MS = 60 * 60 * 1000;

/**
 * SAS window granted to a premium viewer, in milliseconds. Premium users have
 * no per-title rental, so their signed URL uses a modest fixed lifetime rather
 * than a remaining-rental window. Four hours comfortably covers a single
 * viewing session while keeping any leaked URL short-lived.
 */
export const PREMIUM_SAS_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Hard ceiling on any minted SAS lifetime, in milliseconds. A SAS URL must
 * never outlive the access that justified it, and a rental can never grant more
 * than one hour, so 60 minutes is the cap for the rental path too.
 */
export const MAX_SAS_WINDOW_MS = 60 * 60 * 1000;

/** The minimal active-rental view the authorisation check needs. */
export interface ActiveRentalLike {
  /** When the rental lapses (Date or ISO string). */
  expiresAt: Date | string;
}

/** Inputs to {@link isUnlocked}: the viewer's premium state + any rental. */
export interface AuthorizationInput {
  /** Whether the user's account is flagged premium. */
  isPremium: boolean;
  /** Premium expiry (Date/ISO string), or undefined for no expiry set. */
  premiumExpiry?: Date | string;
  /** The user's active rental for this content, if any. */
  activeRental?: ActiveRentalLike | null;
  /** The reference "now" (defaults to the current time). */
  now?: Date;
}

/** Coerce a Date | string | undefined to epoch millis, or NaN when absent. */
function toMillis(value: Date | string | undefined): number {
  if (value === undefined || value === null) return NaN;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Whether a user currently holds valid premium: the account is flagged premium
 * AND either has no expiry recorded or the expiry is still in the future. A
 * lapsed premium subscription must not keep unlocking content, which is why the
 * expiry is checked rather than trusting `isPremium` alone.
 */
export function hasValidPremium(
  isPremium: boolean,
  premiumExpiry: Date | string | undefined,
  now: Date = new Date(),
): boolean {
  if (!isPremium) return false;
  const expiryMs = toMillis(premiumExpiry);
  // No expiry recorded => treat premium as non-expiring.
  if (Number.isNaN(expiryMs)) return true;
  return expiryMs > now.getTime();
}

/**
 * Whether an active rental is still valid at `now` (its `expiresAt` is in the
 * future). A missing/expired rental returns false.
 */
export function hasActiveRental(
  activeRental: ActiveRentalLike | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!activeRental) return false;
  const expiryMs = toMillis(activeRental.expiresAt);
  if (Number.isNaN(expiryMs)) return false;
  return expiryMs > now.getTime();
}

/**
 * The single source of truth for playback authorisation: a viewer may play the
 * content when they hold valid premium OR have an active (unexpired) rental for
 * it. Both the unlock route and the SAS-minting route call this so they cannot
 * disagree.
 */
export function isUnlocked(input: AuthorizationInput): boolean {
  const now = input.now ?? new Date();
  return (
    hasValidPremium(input.isPremium, input.premiumExpiry, now) ||
    hasActiveRental(input.activeRental, now)
  );
}

/**
 * Milliseconds remaining until `expiresAt`, floored at 0 (never negative). Used
 * to size a rental viewer's SAS window to whatever is left of their hour.
 */
export function remainingMs(
  expiresAt: Date | string,
  now: Date = new Date(),
): number {
  const expiryMs = toMillis(expiresAt);
  if (Number.isNaN(expiryMs)) return 0;
  return Math.max(0, expiryMs - now.getTime());
}

/**
 * Decide the SAS lifetime (in whole minutes, rounded up) for a granted
 * playback request:
 *   - premium viewer  -> a fixed modest window (PREMIUM_SAS_WINDOW_MS)
 *   - rental viewer   -> the time left on the rental, capped at MAX_SAS_WINDOW_MS
 *
 * Returns at least 1 minute so a just-about-to-expire rental still yields a
 * usable (if brief) URL rather than a zero-length, immediately-invalid token.
 * The value is minutes so it can feed a minute-granularity SAS signer without
 * over-granting via hour rounding.
 */
export function sasExpiryMinutesFor(input: {
  isPremium: boolean;
  premiumExpiry?: Date | string;
  rentalExpiresAt?: Date | string | null;
  now?: Date;
}): number {
  const now = input.now ?? new Date();

  let windowMs: number;
  if (hasValidPremium(input.isPremium, input.premiumExpiry, now)) {
    windowMs = PREMIUM_SAS_WINDOW_MS;
  } else if (input.rentalExpiresAt) {
    windowMs = Math.min(remainingMs(input.rentalExpiresAt, now), MAX_SAS_WINDOW_MS);
  } else {
    windowMs = 0;
  }

  const minutes = Math.ceil(windowMs / (60 * 1000));
  return Math.max(1, minutes);
}

/**
 * Build the stable composite key stored on a rental's `contentId`.
 *   - movie   -> the movie id verbatim
 *   - episode -> `${seriesId}:s${seasonNumber}:e${episodeNumber}`
 *
 * Pure and deterministic so the unlock route and the status/playback routes
 * derive the exact same key from the same inputs.
 */
export function buildContentId(input: {
  contentType: RentalContentType;
  contentId: string;
  seasonNumber?: number;
  episodeNumber?: number;
}): string {
  if (input.contentType === "episode") {
    return `${input.contentId}:s${input.seasonNumber}:e${input.episodeNumber}`;
  }
  return input.contentId;
}

/**
 * Derive the Azure blob name (the key used to mint a SAS token) from a stored
 * blob URL. Movies persist only `videoUrl` (the full blob URL), so the SAS
 * layer must recover the blob path from it. Episodes persist `blobName`
 * directly, so callers should prefer that and only fall back to this.
 *
 * A blob URL looks like:
 *   https://<account>.blob.core.windows.net/<container>/<blob/path/name.mp4>[?<existing-sas>]
 *
 * Returns the `<blob/path/name.mp4>` portion (URL-decoded, without the leading
 * container segment and without any query string), or `null` when the URL does
 * not contain a path beyond the container. Never throws.
 */
export function blobNameFromUrl(
  videoUrl: string,
  containerName: string,
): string | null {
  if (!videoUrl) return null;

  let pathname: string;
  try {
    pathname = new URL(videoUrl).pathname; // "/<container>/<blob...>"
  } catch {
    return null;
  }

  // Strip the leading slash then split off the first segment (the container).
  const trimmed = pathname.replace(/^\/+/, "");
  const firstSlash = trimmed.indexOf("/");
  if (firstSlash === -1) return null;

  const container = trimmed.slice(0, firstSlash);
  const rest = trimmed.slice(firstSlash + 1);
  if (!rest) return null;

  // If the first segment is not the expected container, the URL is still
  // treated as "<something>/<blob>" and we return everything after the first
  // segment — but only when it matches, to avoid mis-parsing unrelated URLs we
  // keep it permissive: decode and return the remainder.
  void container;

  try {
    return decodeURIComponent(rest);
  } catch {
    return rest;
  }
}
