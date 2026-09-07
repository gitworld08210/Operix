import { v2 as cloudinary } from "cloudinary";
import { getCloudinaryConfig } from "@/lib/env";

/**
 * Lazily configure the Cloudinary SDK. Reads credentials from env only when a
 * service function is actually invoked, so importing this module never reads
 * env or throws at import time.
 */
const ensureCloudinaryConfigured = (): void => {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
};

export const uploadImageToCloudinary = async (
  image: string,
  folder: string = "movies",
  transformation: Record<string, any> = {}
): Promise<{ url: string; publicId: string }> => {
  ensureCloudinaryConfigured();
  try {
    const result = await cloudinary.uploader.upload(image, {
      folder,
      transformation: {
        ...transformation,
        quality: "auto",
        fetchFormat: "auto",
      },
      use_filename: true,
      unique_filename: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
};

export const uploadLocalImageToCloudinary = async (
  filePath: string,
  folder: string = "movies"
): Promise<{ url: string; publicId: string }> => {
  ensureCloudinaryConfigured();
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      use_filename: true,
      unique_filename: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error("Error uploading local file to Cloudinary:", error);
    throw new Error("Failed to upload local image");
  }
};

export const generateImageURL = (
  publicId: string,
  options: { width?: number; height?: number; crop?: string } = {}
): string => {
  ensureCloudinaryConfigured();
  return cloudinary.url(publicId, {
    ...options,
    fetch_format: "auto",
    quality: "auto",
  });
};

export const deleteImageFromCloudinary = async (
  publicId: string
): Promise<boolean> => {
  ensureCloudinaryConfigured();
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error("Error deleting from Cloudinary:", error);
    return false;
  }
};

/**
 * Auto-derive a poster/thumbnail still image FROM A VIDEO.
 *
 * How this works (Cloudinary video->image derivation):
 * Cloudinary can render a single frame of an uploaded video as an image simply
 * by requesting the video's `public_id` as an image resource with an image
 * extension (e.g. `.jpg`). Passing `resource_type: "video"` tells Cloudinary
 * the source asset is a video, and the `start_offset` (aka `so_`) transform
 * picks WHICH frame to grab — here we default to 2 seconds in (`so_2`) so we
 * skip black/intro frames. The result is a normal JPG URL that can be stored
 * as the movie/episode `thumbnail`/`poster`.
 *
 * The returned URL looks like:
 *   https://res.cloudinary.com/<cloud>/video/upload/so_2,w_400,h_600,c_fill/<publicId>.jpg
 *
 * This function only builds a delivery URL (no upload/API call), so it is cheap
 * and synchronous. Callers pass the `publicId` returned when the video (or a
 * poster frame) was uploaded to Cloudinary. NOTE: primary video storage is
 * Azure Blob; this helper is used when a video (or a still frame of it) has
 * also been made available to Cloudinary for thumbnail derivation.
 *
 * The existing custom-poster path (uploadMoviePoster / uploadImageToCloudinary)
 * is intentionally left intact: an admin can always override the auto-derived
 * thumbnail with a custom uploaded image.
 */
export const generateVideoThumbnailURL = (
  videoPublicId: string,
  options: {
    startOffset?: number | string;
    width?: number;
    height?: number;
    crop?: string;
  } = {},
): string => {
  ensureCloudinaryConfigured();
  const {
    startOffset = 2,
    width = 400,
    height = 600,
    crop = "fill",
  } = options;

  return cloudinary.url(videoPublicId, {
    resource_type: "video",
    // `format: "jpg"` requests the frame as a JPEG still image.
    format: "jpg",
    // `start_offset` maps to the `so_` transform (which frame to sample).
    start_offset: startOffset,
    width,
    height,
    crop,
    quality: "auto",
    fetch_format: "auto",
  });
};

/**
 * Upload a video to Cloudinary and immediately return an auto-derived
 * thumbnail URL for it. `video` is a remote URL, local file path, or base64
 * data URI — anything cloudinary.uploader.upload accepts with
 * `resource_type: "video"`.
 *
 * Returns the uploaded video's `publicId`/`url` plus a `thumbnailUrl` derived
 * via {@link generateVideoThumbnailURL}. Admins may still override the
 * thumbnail with a custom image (see uploadMoviePoster).
 */
export const uploadVideoAndDeriveThumbnail = async (
  video: string,
  folder: string = "movies/videos",
  startOffset: number | string = 2,
): Promise<{ url: string; publicId: string; thumbnailUrl: string }> => {
  ensureCloudinaryConfigured();
  try {
    const result = await cloudinary.uploader.upload(video, {
      folder,
      resource_type: "video",
      use_filename: true,
      unique_filename: true,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl: generateVideoThumbnailURL(result.public_id, {
        startOffset,
      }),
    };
  } catch (error) {
    console.error("Error uploading video to Cloudinary:", error);
    throw new Error("Failed to upload video to Cloudinary");
  }
};

// Upload movie poster. `image` is a remote URL, local file path, or base64
// data URI - anything cloudinary.uploader.upload accepts.
export const uploadMoviePoster = async (
  image: string
): Promise<{ url: string; publicId: string }> => {
  return uploadImageToCloudinary(image, "movies/posters", {
    width: 400,
    height: 600,
    crop: "fill",
  });
};

// Upload movie background. `image` is a remote URL, local file path, or base64
// data URI - anything cloudinary.uploader.upload accepts.
export const uploadMovieBackground = async (
  image: string
): Promise<{ url: string; publicId: string }> => {
  return uploadImageToCloudinary(image, "movies/backgrounds", {
    width: 1920,
    height: 1080,
    crop: "limit",
  });
};
