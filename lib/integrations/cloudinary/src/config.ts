import type { CloudinaryCredentials } from "./types.js";

const ENV_KEYS = {
  cloudName: "CLOUDINARY_CLOUD_NAME",
  apiKey: "CLOUDINARY_API_KEY",
  apiSecret: "CLOUDINARY_API_SECRET",
} as const;

export function readCloudinaryCredentials(): CloudinaryCredentials | null {
  const cloudName = process.env[ENV_KEYS.cloudName]?.trim();
  const apiKey = process.env[ENV_KEYS.apiKey]?.trim();
  const apiSecret = process.env[ENV_KEYS.apiSecret]?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

export function requireCloudinaryCredentials(): CloudinaryCredentials {
  const credentials = readCloudinaryCredentials();
  if (!credentials) {
    const missing = Object.values(ENV_KEYS).filter((key) => !process.env[key]?.trim());
    throw new Error(
      `Cloudinary is not configured. Set ${missing.join(", ")} in the environment.`,
    );
  }
  return credentials;
}

export function isCloudinaryConfigured(): boolean {
  return readCloudinaryCredentials() !== null;
}
