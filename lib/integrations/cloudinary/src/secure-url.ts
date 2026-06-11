import { v2 as cloudinary } from "cloudinary";
import type { SecureUrlOptions } from "./types.js";

export function buildSecureUrl(
  publicId: string,
  options: SecureUrlOptions = {},
): string {
  const transformation: Record<string, unknown>[] = [];

  if (options.width || options.height) {
    transformation.push({
      width: options.width,
      height: options.height,
      crop: options.crop ?? "fill",
    });
  }

  if (options.quality) {
    transformation.push({ quality: options.quality });
  }

  if (options.format) {
    transformation.push({ fetch_format: options.format });
  }

  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: "authenticated",
    transformation: transformation.length > 0 ? transformation : undefined,
  });
}
