import type { NextRequest } from "next/server";

import { isAuthorizedAdmin } from "@/lib/adminAuth";
import { ok, fail } from "@/lib/apiResponse";
import { uploadMovieMetadataSchema } from "@/lib/validation";
import { createMovie } from "@/services/mongodb/movieRepository";
import { uploadVideoWithThumbnail } from "@/services/upload/uploadPipeline";

export const dynamic = "force-dynamic";

/**
 * POST /api/upload/movie  (multipart/form-data)
 *
 * Upload a single movie:
 *   - `video` file  -> Azure Blob (private) via uploadVideoToAzure
 *   - auto-thumbnail -> Cloudinary (unless a custom `poster` URL is provided)
 *   - metadata      -> MongoDB via the movie repository
 *
 * Admin-gated (fails closed with 401). Text metadata fields are validated with
 * `uploadMovieMetadataSchema`; array fields (`cast`, `genres`) may be sent as
 * comma-separated strings.
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

  const parsed = uploadMovieMetadataSchema.safeParse({
    title: form.get("title") ?? undefined,
    description: form.get("description") ?? undefined,
    year: form.get("year") ?? undefined,
    duration: form.get("duration") ?? undefined,
    genre: form.get("genre") ?? undefined,
    genres: splitList(form.get("genres")),
    cast: splitList(form.get("cast")),
    director: form.get("director") ?? undefined,
    premium: form.get("premium") ?? undefined,
    rating: form.get("rating") ?? undefined,
    poster: emptyToUndefined(form.get("poster")),
    background: emptyToUndefined(form.get("background")),
    thumbnail: emptyToUndefined(form.get("thumbnail")),
  });
  if (!parsed.success) {
    return fail("Invalid movie metadata", 400);
  }

  const meta = parsed.data;

  let uploaded;
  try {
    uploaded = await uploadVideoWithThumbnail(video, {
      customPoster: meta.poster,
      folder: "movies/videos",
    });
  } catch {
    return fail("Failed to upload video/thumbnail", 502);
  }

  // Poster: explicit custom poster wins; otherwise use the derived thumbnail.
  const poster = meta.poster ?? uploaded.thumbnailUrl;
  // Background: reuse a provided background, else fall back to the poster.
  const background = meta.background ?? poster;

  try {
    const movie = await createMovie({
      title: meta.title,
      description: meta.description,
      poster,
      background,
      thumbnail: meta.thumbnail ?? uploaded.thumbnailUrl,
      videoUrl: uploaded.videoUrl,
      videoThumbnail: uploaded.thumbnailUrl,
      rating: meta.rating ?? 0,
      year: meta.year,
      duration: meta.duration,
      genre: meta.genre,
      genres: meta.genres,
      cast: meta.cast ?? [],
      director: meta.director,
      premium: meta.premium ?? false,
    });
    return ok(movie, undefined, 201);
  } catch {
    return fail("Failed to save movie", 500);
  }
}

/** Split a comma-separated form value into a trimmed string array (or undefined). */
function splitList(value: FormDataEntryValue | null): string[] | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/** Normalise an empty form string to `undefined` so optional URLs stay optional. */
function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  return value;
}
