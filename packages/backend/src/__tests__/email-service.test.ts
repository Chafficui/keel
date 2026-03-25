import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("sendEmail service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    // Clear any cached env values
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("does not throw when RESEND_API_KEY is not set", async () => {
    // Mock env without RESEND_API_KEY
    vi.doMock("../env.js", () => ({
      env: {
        RESEND_API_KEY: "",
        EMAIL_FROM: "noreply@test.com",
      },
    }));

    // Mock the logger so we can verify it's called
    const mockDebug = vi.fn();
    vi.doMock("../lib/logger.js", () => ({
      logger: {
        debug: mockDebug,
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        fatal: vi.fn(),
      },
    }));

    const { sendEmail } = await import("../services/email.js");

    await sendEmail({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    // Should log via logger.debug instead of sending
    expect(mockDebug).toHaveBeenCalled();
  });

  it("creates Resend instance when API key is provided", async () => {
    const mockSend = vi.fn().mockResolvedValue({ id: "email-1" });

    vi.doMock("resend", () => ({
      Resend: class MockResend {
        emails = { send: mockSend };
      },
    }));

    vi.doMock("../env.js", () => ({
      env: {
        RESEND_API_KEY: "re_test_123",
        EMAIL_FROM: "noreply@test.com",
      },
    }));

    const { sendEmail } = await import("../services/email.js");

    await sendEmail({
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Content</p>",
    });

    expect(mockSend).toHaveBeenCalledWith({
      from: "noreply@test.com",
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>Content</p>",
    });
  });
});
