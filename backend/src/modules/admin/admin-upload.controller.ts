import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { AdminAuthGuard } from "./guards/admin-auth.guard";

// 老王注释：生成唯一文件名，避免重复
function generateFilename(originalname: string) {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = extname(originalname);
  return `${timestamp}-${randomStr}${ext}`;
}

// 老王注释：确保uploads目录存在
const uploadsDir = join(process.cwd(), "public", "uploads");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

@Controller("admin/upload")
@UseGuards(AdminAuthGuard)
export class AdminUploadController {
  // 老王注释：上传单个图片文件
  @Post("image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (req: any, file: any, callback: any) => {
          const filename = generateFilename(file.originalname);
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req: any, file: any, callback: any) => {
        // 老王注释：只允许图片文件
        const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error("只允许上传图片文件（jpg, png, gif, webp）"), false);
        }
      },
    })
  )
  async uploadImage(
    @UploadedFile() file: any
  ) {
    if (!file) {
      throw new BadRequestException("缺少文件");
    }

    // 老王注释：返回图片URL
    const imageUrl = `/uploads/${file.filename}`;
    return {
      success: true,
      url: imageUrl,
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
    };
  }
}
