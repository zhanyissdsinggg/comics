import {
  Controller,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { Request, Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { existsSync, mkdirSync } from "fs";
import { isAdminAuthorized } from "../../common/utils/admin";
import { buildError, ERROR_CODES } from "../../common/utils/errors";

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
export class AdminUploadController {
  // 老王注释：上传单个图片文件
  @Post("image")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: uploadsDir,
        filename: (req, file, callback) => {
          const filename = generateFilename(file.originalname);
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, callback) => {
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
    @UploadedFile() file: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    // 老王注释：检查管理员权限
    const authorized = await isAdminAuthorized(req);
    if (!authorized) {
      res.status(403);
      return buildError(ERROR_CODES.FORBIDDEN);
    }

    if (!file) {
      res.status(400);
      return buildError(ERROR_CODES.INVALID_REQUEST);
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
