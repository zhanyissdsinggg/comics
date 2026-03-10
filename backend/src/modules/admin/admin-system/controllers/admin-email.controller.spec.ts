import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { EmailService } from "../../../email/email.service";
import { AdminAuthGuard } from "../../guards/admin-auth.guard";
import { AdminEmailController } from "./admin-email.controller";

describe("AdminEmailController", () => {
  let controller: AdminEmailController;
  let prisma: {
    emailConfig: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
  };
  let emailService: {
    sendEmail: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      emailConfig: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    };

    emailService = {
      sendEmail: jest.fn().mockResolvedValue({ ok: true }),
    };

    const builder = Test.createTestingModule({
      controllers: [AdminEmailController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
      ],
    });

    builder.overrideGuard(AdminAuthGuard).useValue({ canActivate: () => true });

    const module: TestingModule = await builder.compile();
    controller = module.get(AdminEmailController);
  });

  it("parses stored config and masks secrets", async () => {
    prisma.emailConfig.findUnique.mockResolvedValue({
      key: "default",
      payload: JSON.stringify({
        provider: "resend",
        from: "ops@gush.test",
        resendApiKey: "real-secret",
        sendgridApiKey: "",
        smsWebhookUrl: "https://sms.example.com",
      }),
    });

    const result = await controller.getConfig();

    expect(result).toEqual({
      config: expect.objectContaining({
        provider: "resend",
        from: "ops@gush.test",
        resendApiKey: "********",
        smsWebhookUrl: "********",
      }),
    });
  });

  it("accepts flat save payloads and returns masked config", async () => {
    prisma.emailConfig.findUnique.mockResolvedValue({
      key: "default",
      payload: JSON.stringify({
        provider: "console",
        from: "",
        resendApiKey: "stored-secret",
        sendgridApiKey: "",
        smsWebhookUrl: "",
        adminNotifyEmail: "",
        testRecipient: "",
      }),
    });
    prisma.emailConfig.upsert.mockResolvedValue({
      key: "default",
      payload: "{}",
    });

    const result = await controller.save(
      {
        provider: "resend",
        from: "support@gush.test",
        resendApiKey: "********",
        adminNotifyEmail: "alerts@gush.test",
        testRecipient: "qa@gush.test",
      },
      { userId: "admin-1" } as never,
    );

    expect(prisma.emailConfig.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          payload: expect.stringContaining("support@gush.test"),
        }),
      }),
    );
    expect(result.config).toEqual(
      expect.objectContaining({
        provider: "resend",
        from: "support@gush.test",
        resendApiKey: "********",
        adminNotifyEmail: "alerts@gush.test",
      }),
    );
  });

  it("clears stored secrets when an empty value is submitted", async () => {
    prisma.emailConfig.findUnique.mockResolvedValue({
      key: "default",
      payload: JSON.stringify({
        provider: "resend",
        from: "ops@gush.test",
        resendApiKey: "stored-secret",
        sendgridApiKey: "stored-sendgrid",
        smsWebhookUrl: "stored-sms",
        adminNotifyEmail: "alerts@gush.test",
        testRecipient: "qa@gush.test",
      }),
    });

    await controller.save(
      {
        resendApiKey: "",
      },
      { userId: "admin-1" } as never,
    );

    const savedPayload = JSON.parse(prisma.emailConfig.upsert.mock.calls[0][0].update.payload);
    expect(savedPayload.resendApiKey).toBe("");
    expect(savedPayload.sendgridApiKey).toBe("stored-sendgrid");
  });

  it("accepts flat test payloads", async () => {
    const result = await controller.test({ to: "reader@gush.test" });

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      "reader@gush.test",
      "Test email",
      "<p>This is a test email from Gush Admin.</p>",
      "This is a test email from Gush Admin.",
    );
    expect(result).toEqual({ ok: true });
  });
});
