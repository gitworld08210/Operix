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
import { getSeriesById } from "@/services/mongodb/seriesRepository";
import { getActiveRental } from "@/services/mongodb/rentalRepository";

export const dynamic = "force-dynamic";

/** Context argument carrying the dynamic `[seriesId]` route segment. */
interface RouteContext {
  params: { seriesId: string };
}

/** Shape returned to the player: a short-lived signed source URL only. */
interface PlaybackResult {
  url: string;
  expiresAt: string;
  premium: boolean;
}

/**
 * GET /api/playback/episode/:seriesId?seasonNumber=&episodeNumber=
 *
 * Episode counterpart of the movie playback route. Locates the episode within
 * its series, then applies the SAME authorisation + SAS-minting rules via the
 * shared `isUnlocked` / `sasExpiryMinutesFor` helpers. Episodes persist their
 * own `blobName`, so the SAS is minted from that directly (falling back to
 * parsing the blob URL when absent).
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("Not authenticated", 401);
  }

  const url = new URL(request.url);
  const seasonNumber = Number(url.searchParams.get("seasonNumber"));
  const episodeNumber = Number(url.searchParams.get("episodeNumber"));
  if (
    !Number.isInteger(seasonNumber) ||
    !Number.isInteger(episodeNumber) ||
    seasonNumber < 1 ||
    episodeNumber < 1
  ) {
    return fail("Invalid seasonNumber/episodeNumber", 400);
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

  let series;
  try {
    series = await getSeriesById(params.seriesId);
  } catch {
    return fail("Failed to load series", 500);
  }
  if (!series) {
    return fail("Series not found", 404);
  }

  const season = series.seasons.find((s) => s.seasonNumber === seasonNumber);
  const episode = season?.episodes.find(
    (e) => e.episodeNumber === episodeNumber,
  );
  if (!episode) {
    return fail("Episode not found", 404);
  }

  const contentId = buildContentId({
    contentType: "episode",
    contentId: params.seriesId,
    seasonNumber,
    episodeNumber,
  });
  const now = new Date();

  try {
    const activeRental = await getActiveRental(session.sub, {
      contentType: "episode",
      contentId,
    });

    if (!isUnlocked({ ...viewer, activeRental, now })) {
      return fail("Content is locked", 403);
    }

    const blobName =
      episode.blobName ??
      blobNameFromUrl(episode.videoUrl, getAzureContainer());
    if (!blobName) {
      return fail("Playback source unavailable", 422);
    }

    const expiryMinutes = sasExpiryMinutesFor({
      isPremium: viewer.isPremium,
      premiumExpiry: viewer.premiumExpiry,
      rentalExpiresAt: activeRental?.expiresAt ?? null,
      now,
    });

    const signedUrl = await generateSasToken(getAzureContainer(), blobName, 0, {
      expiryMinutes,
    });

    const result: PlaybackResult = {
      url: signedUrl,
      expiresAt: new Date(
        now.getTime() + expiryMinutes * 60 * 1000,
      ).toISOString(),
      premium: activeRental === null,
    };
    return ok(result);
  } catch {
    return fail("Failed to prepare playback", 500);
  }
}
