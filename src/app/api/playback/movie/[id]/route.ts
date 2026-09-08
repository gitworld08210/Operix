import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { getSessionFromRequest } from "@/lib/authSession";
import { getAzureContainer } from "@/lib/env";
import {
  blobNameFromUrl,
  buildContentId,
  isUnlocked,
  sasExpiryMinutesFor,
} from "@/lib/playbackAccess";
import { resolveViewerPremium } from "@/lib/viewerPremium";
import { generateSasToken } from "@/services/azure/blobService";
import { getMovieById } from "@/services/mongodb/movieRepository";
import { getActiveRental } from "@/services/mongodb/rentalRepository";

export const dynamic = "force-dynamic";

/** Context argument carrying the dynamic `[id]` route segment. */
interface RouteContext {
  params: { id: string };
}

/** Shape returned to the player: a short-lived signed source URL only. */
interface PlaybackResult {
  /** Time-limited SAS URL. Never a permanent/shareable URL. */
  url: string;
  /** When this URL (and the underlying access) expires (ISO string). */
  expiresAt: string;
  /** True when access is via premium rather than a rental. */
  premium: boolean;
}

/**
 * GET /api/playback/movie/:id
 *
 * The security core of playback: it is the ONLY place a signed video URL is
 * minted, and it does so only after confirming the caller may watch.
 *
 *   - No session          -> 401.
 *   - Movie not found      -> 404.
 *   - Locked (not premium, no active rental) -> 403.
 *   - Granted             -> mint a SAS whose lifetime matches the REMAINING
 *                            rental window (capped at 60m) or a modest fixed
 *                            window for premium, and return only that URL.
 *
 * The permanent blob URL (`movie.videoUrl`) and blob name are never sent to the
 * client; the SAS is derived server-side from them.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("Not authenticated", 401);
  }

  let viewer;
  try {
    viewer = await resolveViewerPremium(session);
  } catch {
    return fail("Failed to resolve viewer", 500);
  }
  if (!viewer) {
    return fail("Not authenticated", 401);
  }

  let movie;
  try {
    movie = await getMovieById(params.id);
  } catch {
    return fail("Failed to load movie", 500);
  }
  if (!movie) {
    return fail("Movie not found", 404);
  }

  const contentId = buildContentId({
    contentType: "movie",
    contentId: params.id,
  });
  const now = new Date();

  try {
    const activeRental = await getActiveRental(session.sub, {
      contentType: "movie",
      contentId,
    });

    if (!isUnlocked({ ...viewer, activeRental, now })) {
      return fail("Content is locked", 403);
    }

    const blobName = blobNameFromUrl(movie.videoUrl, getAzureContainer());
    if (!blobName) {
      return fail("Playback source unavailable", 422);
    }

    const expiryMinutes = sasExpiryMinutesFor({
      isPremium: viewer.isPremium,
      premiumExpiry: viewer.premiumExpiry,
      rentalExpiresAt: activeRental?.expiresAt ?? null,
      now,
    });

    const url = await generateSasToken(getAzureContainer(), blobName, 0, {
      expiryMinutes,
    });

    const result: PlaybackResult = {
      url,
      expiresAt: new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString(),
      premium: activeRental === null,
    };
    return ok(result);
  } catch {
    return fail("Failed to prepare playback", 500);
  }
}
