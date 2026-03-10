import { Test, TestingModule } from "@nestjs/testing";
import { AdminLogService } from "../../../../common/services/admin-log.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminLogsController } from "./admin-logs.controller";

describe("AdminLogsController", () => {
  let controller: AdminLogsController;
  let adminLogService: { log: jest.Mock; query: jest.Mock };

  beforeEach(async () => {
    adminLogService = {
      log: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ logs: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }),
    };

    const builder = Test.createTestingModule({
      controllers: [AdminLogsController],
      providers: [{ provide: AdminLogService, useValue: adminLogService }],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get(AdminLogsController);
  });

  it("blocks audit log deletion and records the attempt", async () => {
    await expect(
      controller.remove("log-1", {
        headers: {},
        userId: "admin-1",
      } as never),
    ).rejects.toThrow("Audit logs are append-only and cannot be deleted.");

    expect(adminLogService.log).toHaveBeenCalledWith(
      "audit_log_delete_blocked",
      "admin_log",
      "log-1",
      { reason: "append_only" },
      expect.anything(),
    );
  });
});
