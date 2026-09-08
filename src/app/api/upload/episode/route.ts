import type { NextRequest } from "next/server";

import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { ok, fail } from "@/lib/apiResponse";
import { uploadEpisodeMetadataSchema } from "@/lib/validation";
import { addEpisodeToSeries } from "@/services/mongodb/seriesRepository";
import { uploadVideoWithThumbnail } from "@/services/upload/uploadPipeline";
import type { Episode } from "@/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload/episode  (multipart/form-data)
 *
 * Upload one episode into an existing series:
 *   - `video` file  -> Azure Blob (private)
 *   - auto-thumbnail -> Cloudinary (unless a custom `thumbnail` URL is provided)
 *   - the episode is inserted into the series' season (created if missing;
 *     an existing episode with the same number is replaced)
 *
 * Admin-gated (fails closed with 401). Responds 404 when the series is missing.
 */
export async function POST(request: NextRequest) {
  if (!isAuthorizedAdmin(request)) {
    return fail("Unauthorized", 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Expected multipart/form-data", 400);
  }

  const video = form.get("video");
  if (!(video instanceof File)) {
    return fail("Missing 'video' file", 400);
  }

  const parsed = uploadEpisodeMetadataSchema.safeParse({
    seriesId: form.get("seriesId") ?? undefined,
    seasonNumber: form.get("seasonNumber") ?? undefined,
    seasonTitle: emptyToUndefined(form.get("seasonTitle")),
    episodeNumber: form.get("episodeNumber") ?? undefined,
    title: form.get("title") ?? undefined,
    description: emptyToUndefined(form.get("description")),
    duration: emptyToUndefined(form.get("duration")),
    thumbnail: emptyToUndefined(form.get("thumbnail")),
  });
  if (!parsed.success) {
    return fail("Invalid episode metadata", 400);
  }

  const meta = parsed.data;

  let uploaded;
  try {
    uploaded = await uploadVideoWithThumbnail(video, {
      customPoster: meta.thumbnail,
      folder: "series/episodes",
    });
  } catch {
    return fail("Failed to upload video/thumbnail", 502);
  }

  const episode: Episode = {
    episodeNumber: meta.episodeNumber,
    title: meta.title,
    description: meta.description,
    videoUrl: uploaded.videoUrl,
    blobName: uploaded.blobName,
    thumbnail: meta.thumbnail ?? uploaded.thumbnailUrl,
    duration: meta.duration,
  };

  try {
    const series = await addEpisodeToSeries(
      meta.seriesId,
      meta.seasonNumber,
      episode,
      meta.seasonTitle,
    );
    if (!series) {
      return fail("Series not found", 404);
    }
    return ok(series, undefined, 201);
  } catch {
    return fail("Failed to save episode", 500);
  }
}

/** Normalise an empty form string to `undefined`. */
function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  return value;
}
