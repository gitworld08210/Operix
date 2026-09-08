import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { getSessionFromRequest } from "@/lib/authSession";
import { buildContentId, isUnlocked } from "@/lib/playbackAccess";
import { unlockStatusQuerySchema } from "@/lib/validation";
import { resolveViewerPremium } from "@/lib/viewerPremium";
import { getActiveRental } from "@/services/mongodb/rentalRepository";

export const dynamic = "force-dynamic";

/** Shape returned by the status endpoint. */
interface UnlockStatus {
  /** Whether the caller may currently play this content. */
  access: boolean;
  /** When access lapses (ISO string); null for premium / when locked. */
  expiresAt: string | null;
  /** True when access is via premium rather than a rental. */
  premium: boolean;
}

/**
 * GET /api/unlock/status?contentType=&contentId=[&seriesId=&seasonNumber=&episodeNumber=]
 *
 * Report whether the signed-in user can currently play the given content and,
 * when it is a rental, when that access expires. Used by the player to decide
 * whether to show the unlock overlay and to seed the countdown timer.
 *
 * Returns 401 when there is no session. Never leaks a video URL or blob name.
 */
export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("Not authenticated", 401);
  }

  const url = new URL(request.url);
  const parsed = unlockStatusQuerySchema.safeParse({
    contentType: url.searchParams.get("contentType") ?? undefined,
    contentId: url.searchParams.get("contentId") ?? undefined,
    seriesId: url.searchParams.get("seriesId") ?? undefined,
    seasonNumber: url.searchParams.get("seasonNumber") ?? undefined,
    episodeNumber: url.searchParams.get("episodeNumber") ?? undefined,
  });
  if (!parsed.success) {
    return fail("Invalid status query", 400);
  }
  const input = parsed.data;

  let viewer;
  try {
    viewer = await resolveViewerPremium(session);
  } catch {
    return fail("Failed to resolve viewer", 500);
  }
  if (!viewer) {
    return fail("Not authenticated", 401);
  }

  const contentId = buildContentId(input);
  const now = new Date();

  try {
    // Premium short-circuit: no rental lookup needed.
    if (isUnlocked({ ...viewer, activeRental: null, now })) {
      const status: UnlockStatus = {
        access: true,
        expiresAt: null,
        premium: true,
      };
      return ok(status);
    }

    const rental = await getActiveRental(session.sub, {
      contentType: input.contentType,
      contentId,
    });

    const status: UnlockStatus = {
      access: rental !== null,
      expiresAt: rental?.expiresAt ?? null,
      premium: false,
    };
    return ok(status);
  } catch {
    return fail("Failed to read unlock status", 500);
  }
}
