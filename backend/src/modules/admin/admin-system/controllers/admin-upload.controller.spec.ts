import { existsSync, unlinkSync } from "fs";
import { join } from "path";
import { Test, TestingModule } from "@nestjs/testing";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminUploadController } from "./admin-upload.controller";

describe("AdminUploadController", () => {
  let controller: AdminUploadController;

  beforeEach(async () => {
    const builder = Test.createTestingModule({
      controllers: [AdminUploadController],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get<AdminUploadController>(AdminUploadController);
  });

  it("returns an absolute public asset url for uploaded images", async () => {
    const result = await controller.uploadImage(
      {
        originalname: "cover.png",
        mimetype: "image/png",
        size: 1234,
        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      } as Express.Multer.File,
      {
        protocol: "https",
        headers: {
          host: "api.example.com",
          "x-forwarded-proto": "https",
        },
        get: (name: string) => (name === "host" ? "api.example.com" : ""),
      } as never,
    );

    expect(result.url).toBe(`https://api.example.com/uploads/${result.filename}`);
    expect(result.filename.endsWith(".png")).toBe(true);

    const storedPath = join(process.cwd(), "public", "uploads", result.filename);
    if (existsSync(storedPath)) {
      unlinkSync(storedPath);
    }
  });

  it("rejects files whose contents do not match the declared image type", async () => {
    await expect(
      controller.uploadImage(
        {
          originalname: "poc.png",
          mimetype: "image/png",
          size: 32,
          buffer: Buffer.from("<html>not-an-image</html>", "utf8"),
        } as Express.Multer.File,
        {
          protocol: "https",
          headers: { host: "api.example.com" },
          get: (name: string) => (name === "host" ? "api.example.com" : ""),
        } as never,
      ),
    ).rejects.toThrow("Unsupported or corrupted image file.");
  });
});
