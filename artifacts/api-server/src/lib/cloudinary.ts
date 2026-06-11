import {
  cloudinaryService,
  isCloudinaryConfigured,
  requireCloudinaryCredentials,
} from "@workspace/cloudinary";

export { cloudinaryService, isCloudinaryConfigured, requireCloudinaryCredentials };

export function assertMediaUploadReady(): void {
  requireCloudinaryCredentials();
}
