import { decryptString, encryptString } from "../../common/utils/crypto";
import {
  EMAIL_SECRET_PLACEHOLDER,
  decryptEmailConfigSecrets,
  isMaskedSecret,
  maskEmailConfigSecrets,
  parseEmailConfigPayload,
} from "./email-config";

describe("email-config helpers", () => {
  it("parses persisted json payload safely", () => {
    const payload = parseEmailConfigPayload(
      JSON.stringify({
        provider: "resend",
        from: "ops@gush.com",
        resendApiKey: "secret",
        adminNotifyEmail: "alerts@gush.com",
      }),
    );

    expect(payload.provider).toBe("resend");
    expect(payload.from).toBe("ops@gush.com");
    expect(payload.resendApiKey).toBe("secret");
    expect(payload.adminNotifyEmail).toBe("alerts@gush.com");
  });

  it("masks and restores encrypted secrets", () => {
    const encrypted = encryptString("top-secret");
    const payload = parseEmailConfigPayload(
      JSON.stringify({
        provider: "resend",
        resendApiKey: encrypted,
      }),
    );

    expect(maskEmailConfigSecrets(payload).resendApiKey).toBe(EMAIL_SECRET_PLACEHOLDER);
    expect(decryptEmailConfigSecrets(payload).resendApiKey).toBe("top-secret");
    expect(decryptString(encrypted)).toBe("top-secret");
  });

  it("treats legacy and current placeholders as masked secrets", () => {
    expect(isMaskedSecret(EMAIL_SECRET_PLACEHOLDER)).toBe(true);
    expect(isMaskedSecret("????????")).toBe(true);
    expect(isMaskedSecret("plain-text")).toBe(false);
  });
});
