import type { NextRequest } from "next/server";

import { ok, fail } from "@/lib/apiResponse";
import { getSessionFromRequest } from "@/lib/authSession";
import { buildContentId, isUnlocked, RENTAL_TTL_MS } from "@/lib/playbackAccess";
import { unlockRequestSchema } from "@/lib/validation";
import { resolveViewerPremium } from "@/lib/viewerPremium";
import {
  createRental,
  getActiveRental,
} from "@/services/mongodb/rentalRepository";

export const dynamic = "force-dynamic";

/** Shape returned by a successful unlock. */
interface UnlockResult {
  /** Whether the content is now unlocked (always true on a 200). */
  unlocked: true;
  /** When the unlock lapses (ISO string), or null for always-on premium. */
  expiresAt: string | null;
  /** True when access came from premium (no rental row was created). */
  premium: boolean;
}

/**
 * POST /api/unlock
 *
 * Unlock a movie or episode for the signed-in user. This is a USER-session
 * endpoint (NOT admin-gated): any authenticated viewer may unlock content for
 * themselves.
 *
 *   - No session                -> 401.
 *   - Premium (valid)           -> already granted; no rental row is created,
 *                                  `expiresAt: null`.
 *   - Existing active rental    -> returns it (idempotent; no duplicate row).
 *   - Otherwise                 -> creates a 1-hour rental and returns its
 *                                  `expiresAt`.
 *
 * Never returns a video URL or blob name — that is minted only by the playback
 * route once access is confirmed.
 */
export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return fail("Not authenticated", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = unlockRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid unlock request", 400);
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
    // Premium viewers are unlocked without ever creating a rental row.
    if (isUnlocked({ ...viewer, activeRental: null, now })) {
      const result: UnlockResult = {
        unlocked: true,
        expiresAt: null,
        premium: true,
      };
      return ok(result);
    }

    // Reuse an existing active rental so repeated clicks do not stack rows.
    const existing = await getActiveRental(session.sub, {
      contentType: input.contentType,
      contentId,
    });
    if (existing) {
      const result: UnlockResult = {
        unlocked: true,
        expiresAt: existing.expiresAt,
        premium: false,
      };
      return ok(result);
    }

    const rental = await createRental(
      session.sub,
      {
        contentType: input.contentType,
        contentId,
        seriesId: input.seriesId,
        seasonNumber: input.seasonNumber,
        episodeNumber: input.episodeNumber,
      },
      RENTAL_TTL_MS,
    );

    const result: UnlockResult = {
      unlocked: true,
      expiresAt: rental.expiresAt,
      premium: false,
    };
    return ok(result, undefined, 201);
  } catch {
    return fail("Failed to unlock content", 500);
  }
}
