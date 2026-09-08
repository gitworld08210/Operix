import { uploadVideoToAzure } from "@/services/azure/blobService";
import {
  uploadVideoAndDeriveThumbnail,
  uploadMoviePoster,
} from "@/services/cloudinary/cloudinaryService";

/**
 * Shared upload pipeline used by the movie- and episode-upload route handlers.
 *
 * Storage split (by design):
 *   - The playable VIDEO is uploaded to Azure Blob (private container). Playback
 *     is served via short-lived SAS URLs, never a public direct link.
 *   - The THUMBNAIL/poster is auto-derived from the video via Cloudinary. To do
 *     that we hand the same video to Cloudinary purely so it can render a still
 *     frame (see uploadVideoAndDeriveThumbnail / generateVideoThumbnailURL,
 *     which uses a start offset like `so_2`). Admins can override this with a
 *     custom poster instead (see `customPoster`).
 *
 * Only admin-gated route handlers call this; it performs no auth itself.
 */
export interface VideoUploadResult {
  /** Azure Blob URL of the stored video (private; needs SAS to play). */
  videoUrl: string;
  /** Azure blob name/key used to mint SAS tokens. */
  blobName: string;
  /** Poster/thumbnail URL: auto-derived from the video unless overridden. */
  thumbnailUrl: string;
  /** Whether the thumbnail was auto-derived (false when a custom poster won). */
  thumbnailAutoDerived: boolean;
}

export interface UploadVideoWithThumbnailOptions {
  /**
   * Optional custom poster/thumbnail. When provided (a URL, data URI, or local
   * path Cloudinary accepts) it is uploaded and used INSTEAD of the auto-derived
   * still, preserving the existing custom-poster path.
   */
  customPoster?: string;
  /** Cloudinary folder for the derived/custom image + video frame source. */
  folder?: string;
  /** Start offset (seconds) for the auto-derived frame. Defaults to 2. */
  startOffset?: number | string;
}

/**
 * Upload a video file to Azure and produce a thumbnail for it.
 *
 * Steps:
 *  1. Upload the video to Azure Blob (private) -> { url, blobName }.
 *  2. If a custom poster is supplied, upload it to Cloudinary and use that.
 *     Otherwise, upload the video to Cloudinary and auto-derive a still frame.
 *
 * Returns the video location plus the chosen thumbnail URL. Any failure throws;
 * callers translate that into an ApiResponse error.
 */
export async function uploadVideoWithThumbnail(
  file: File,
  options: UploadVideoWithThumbnailOptions = {},
): Promise<VideoUploadResult> {
  const { customPoster, folder = "movies/videos", startOffset = 2 } = options;

  // 1. Video -> Azure Blob (private container).
  const { url: videoUrl, blobName } = await uploadVideoToAzure(file);

  // 2a. Custom poster override (keeps the existing custom-poster path intact).
  if (customPoster) {
    const { url } = await uploadMoviePoster(customPoster);
    return {
      videoUrl,
      blobName,
      thumbnailUrl: url,
      thumbnailAutoDerived: false,
    };
  }

  // 2b. Auto-derive a thumbnail from the video via Cloudinary. We upload the
  // same file's bytes as a base64 data URI so Cloudinary can sample a frame.
  const dataUri = await fileToDataUri(file);
  const { thumbnailUrl } = await uploadVideoAndDeriveThumbnail(
    dataUri,
    folder,
    startOffset,
  );
  return {
    videoUrl,
    blobName,
    thumbnailUrl,
    thumbnailAutoDerived: true,
  };
}

/**
 * Convert a File to a base64 data URI Cloudinary's uploader can ingest.
 *
 * Uses Node's Buffer (these upload routes run in the Node.js runtime) via
 * `globalThis` so no import is needed. Referencing it through `globalThis`
 * keeps the offline type-check clean when @types/node isn't installed while
 * resolving to the real Buffer at runtime.
 */
async function fileToDataUri(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const nodeBuffer = (
    globalThis as unknown as {
      Buffer: { from(input: Uint8Array): { toString(encoding: string): string } };
    }
  ).Buffer;
  const mime = file.type || "video/mp4";
  return `data:${mime};base64,${nodeBuffer.from(bytes).toString("base64")}`;
}
