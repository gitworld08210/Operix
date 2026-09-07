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
