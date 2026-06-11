import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";
import { requireCloudinaryCredentials } from "./config.js";
import {
  announcementAttachmentFolder,
  branchLogoFolder,
  schoolLogoFolder,
  staffPhotoFolder,
  studentDocumentFolder,
  studentPhotoFolder,
} from "./folders.js";
import { buildSecureUrl } from "./secure-url.js";
import type {
  AnnouncementAttachmentContext,
  BranchLogoContext,
  SchoolLogoContext,
  SecureUrlOptions,
  StaffPhotoContext,
  StudentDocumentContext,
  StudentPhotoContext,
  UploadResult,
  UploadSource,
} from "./types.js";

let configured = false;

function ensureConfigured(): void {
  if (configured) return;

  const { cloudName, apiKey, apiSecret } = requireCloudinaryCredentials();
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  configured = true;
}

function toUploadResult(response: UploadApiResponse): UploadResult {
  return {
    publicId: response.public_id,
    secureUrl: response.secure_url,
    width: response.width,
    height: response.height,
    format: response.format,
    bytes: response.bytes,
    resourceType: response.resource_type as UploadResult["resourceType"],
  };
}

async function uploadToFolder(
  file: UploadSource,
  folder: string,
  options: Pick<UploadApiOptions, "public_id" | "resource_type" | "overwrite"> = {},
): Promise<UploadResult> {
  ensureConfigured();

  const uploadOptions: UploadApiOptions = {
    folder,
    type: "authenticated",
    overwrite: options.overwrite ?? true,
    resource_type: options.resource_type ?? "auto",
    ...options,
  };

  const response =
    typeof file === "string"
      ? await cloudinary.uploader.upload(file, uploadOptions)
      : await new Promise<UploadApiResponse>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) reject(error);
            else if (!result) reject(new Error("Cloudinary upload returned no result"));
            else resolve(result);
          });
          stream.end(file);
        });

  const result = toUploadResult(response);
  result.secureUrl = buildSecureUrl(result.publicId);
  return result;
}

export class CloudinaryService {
  uploadStudentPhoto(
    file: UploadSource,
    context: StudentPhotoContext,
  ): Promise<UploadResult> {
    return uploadToFolder(file, studentPhotoFolder(context), {
      public_id: "photo",
      resource_type: "image",
    });
  }

  uploadStudentDocument(
    file: UploadSource,
    context: StudentDocumentContext,
  ): Promise<UploadResult> {
    const safeType = context.documentType.replace(/[^\w-]+/g, "_").slice(0, 60);
    const safeName = context.filename?.replace(/[^\w.-]+/g, "_").slice(0, 120);
    const publicId =
      context.documentType === "other" && safeName
        ? `other_${safeName}`
        : safeType;
    return uploadToFolder(file, studentDocumentFolder(context), {
      public_id: publicId,
      resource_type: "auto",
      overwrite: context.documentType !== "other",
    });
  }

  uploadStaffPhoto(file: UploadSource, context: StaffPhotoContext): Promise<UploadResult> {
    return uploadToFolder(file, staffPhotoFolder(context), {
      public_id: "photo",
      resource_type: "image",
    });
  }

  uploadSchoolLogo(file: UploadSource, context: SchoolLogoContext): Promise<UploadResult> {
    return uploadToFolder(file, schoolLogoFolder(context), {
      public_id: "logo",
      resource_type: "image",
    });
  }

  uploadBranchLogo(file: UploadSource, context: BranchLogoContext): Promise<UploadResult> {
    return uploadToFolder(file, branchLogoFolder(context), {
      public_id: "logo",
      resource_type: "image",
    });
  }

  uploadAnnouncementAttachment(
    file: UploadSource,
    context: AnnouncementAttachmentContext,
    filename?: string,
  ): Promise<UploadResult> {
    const safeName = filename?.replace(/[^\w.-]+/g, "_").slice(0, 120);
    return uploadToFolder(file, announcementAttachmentFolder(context), {
      public_id: safeName,
      resource_type: "auto",
      overwrite: false,
    });
  }

  getSecureUrl(publicId: string, options?: SecureUrlOptions): string {
    ensureConfigured();
    return buildSecureUrl(publicId, options);
  }

  async deleteAsset(publicId: string, resourceType: UploadResult["resourceType"] = "image") {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, {
      type: "authenticated",
      resource_type: resourceType,
    });
  }
}

export const cloudinaryService = new CloudinaryService();
