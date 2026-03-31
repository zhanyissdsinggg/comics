import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import type { Request } from "express";
import { memoryStorage } from "multer";
import { extname, join } from "path";
import { buildPublicAssetUrl } from "../../../../common/utils/public-asset-url";
import { RequireAdminPermissions } from "../../decorators/admin-permissions.decorator";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminPermission } from "../../permissions/admin-permissions";

type ImageKind = "jpeg" | "png" | "gif" | "webp";

type UploadedImageFile = {
  filename?: string;
  originalname: string;
  size: number;
  mimetype?: string;
  buffer?: Buffer;
};

const IMAGE_RULES: Record<ImageKind, { extensions: string[]; mimes: string[] }> = {
  jpeg: { extensions: [".jpg", ".jpeg"], mimes: ["image/jpeg", "image/jpg"] },
  png: { extensions: [".png"], mimes: ["image/png"] },
  gif: { extensions: [".gif"], mimes: ["image/gif"] },
  webp: { extensions: [".webp"], mimes: ["image/webp"] },
};

const uploadsDir = join(process.cwd(), "public", "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

function generateFilename(extension: string) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${randomStr}${extension}`;
}

function getOriginalExtension(originalname: string): string {
  return extname(String(originalname || "")).toLowerCase();
}

function detectImageKind(buffer: Buffer): ImageKind | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header === "GIF87a" || header === "GIF89a") {
      return "gif";
    }
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

function getStoredExtension(kind: ImageKind): string {
  return kind === "jpeg" ? ".jpg" : `.${kind}`;
}

function isDeclaredImageFile(originalname: string, mimetype: string): boolean {
  const normalizedExt = getOriginalExtension(originalname);
  const normalizedMime = String(mimetype || "").toLowerCase();
  return Object.values(IMAGE_RULES).some((rule) => {
    return rule.extensions.includes(normalizedExt) && rule.mimes.includes(normalizedMime);
  });
}

function validateUploadedImage(file: UploadedImageFile): ImageKind {
  if (!file?.buffer?.length) {
    throw new BadRequestException("Missing file payload");
  }

  if (!isDeclaredImageFile(file.originalname, file.mimetype || "")) {
    throw new BadRequestException("Only JPG, PNG, GIF, and WEBP images are allowed.");
  }

  const detectedKind = detectImageKind(file.buffer);
  if (!detectedKind) {
    throw new BadRequestException("Unsupported or corrupted image file.");
  }

  const rule = IMAGE_RULES[detectedKind];
  const normalizedExt = getOriginalExtension(file.originalname);
  const normalizedMime = String(file.mimetype || "").toLowerCase();
  if (!rule.extensions.includes(normalizedExt) || !rule.mimes.includes(normalizedMime)) {
    throw new BadRequestException("File contents do not match the declared image type.");
  }

  return detectedKind;
}

@Controller("admin/upload")
@UseGuards(AdminAuthGuard)
@RequireAdminPermissions(AdminPermission.UPLOAD_ASSET)
export class AdminUploadController {
  @Post("image")
  @RequireAdminPermissions(AdminPermission.UPLOAD_ASSET)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_req: unknown, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
        if (!isDeclaredImageFile(file.originalname, file.mimetype)) {
          callback(new BadRequestException("Only JPG, PNG, GIF, and WEBP images are allowed."), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: UploadedImageFile, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException("Missing file");
    }

    let filename = String(file.filename || "").trim();
    let mimeType = String(file.mimetype || "").trim();

    if (file.buffer?.length) {
      const imageKind = validateUploadedImage(file);
      filename = generateFilename(getStoredExtension(imageKind));
      mimeType = IMAGE_RULES[imageKind].mimes[0];
      writeFileSync(join(uploadsDir, filename), file.buffer);
    }

    if (!filename) {
      throw new BadRequestException("Missing stored filename");
    }

    const imageUrl = buildPublicAssetUrl(req, `/uploads/${filename}`);
    return {
      success: true,
      url: imageUrl,
      filename,
      originalname: file.originalname,
      size: file.size,
      mimeType,
    };
  }
}
