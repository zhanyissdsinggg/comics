import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminRegionsController } from "./admin-regions.controller";

describe("AdminRegionsController", () => {
  let controller: AdminRegionsController;
  let prisma: {
    regionConfig: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      regionConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const builder = Test.createTestingModule({
      controllers: [AdminRegionsController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get(AdminRegionsController);
  });

  it("returns the stored config", async () => {
    prisma.regionConfig.findUnique.mockResolvedValue({
      payload: JSON.stringify({
        countryCodes: [{ code: "+1", label: "US" }],
        lengthRules: { "+1": [10] },
      }),
    });

    const result = await controller.getConfig();

    expect(result).toEqual({
      config: {
        countryCodes: [{ code: "+1", label: "US" }],
        lengthRules: { "+1": [10] },
      },
    });
  });

  it("rejects duplicate country codes after normalization", async () => {
    await expect(
      controller.save({
        countryCodes: [
          { code: "1", label: "US" },
          { code: "+1", label: "United States Duplicate" },
        ],
      }),
    ).rejects.toThrow("Duplicate country code: +1");
  });

  it("filters length rules that do not belong to a configured country code", async () => {
    prisma.regionConfig.upsert.mockResolvedValue({
      payload: JSON.stringify({
        countryCodes: [{ code: "+1", label: "US" }],
        lengthRules: { "+1": [10] },
      }),
    });

    await controller.save({
      countryCodes: [{ code: "+1", label: "US" }],
      lengthRules: {
        "+1": [10, 10, 11],
        "+82": [9, 10, 11],
      },
    });

    const savedPayload = JSON.parse(prisma.regionConfig.upsert.mock.calls[0][0].update.payload);
    expect(savedPayload.countryCodes).toEqual([{ code: "+1", label: "US" }]);
    expect(savedPayload.lengthRules).toEqual({ "+1": [10, 11] });
  });
});
