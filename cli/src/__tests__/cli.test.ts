import { describe, it, expect, vi } from "vitest";

// Mock the interactive prompts since we're testing flag parsing
vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(),
  select: vi.fn(),
  checkbox: vi.fn(),
  confirm: vi.fn(),
}));

const { parseFlags, runPrompts } = await import("../prompts.js");

// ---------------------------------------------------------------------------
// parseFlags
// ---------------------------------------------------------------------------

describe("parseFlags", () => {
  it("parses --yes flag", () => {
    const { flags } = parseFlags(["--yes"]);
    expect(flags.yes).toBe(true);
  });

  it("parses -y shorthand", () => {
    const { flags } = parseFlags(["-y"]);
    expect(flags.yes).toBe(true);
  });

  it("extracts project name from positional arg", () => {
    const { projectName, flags } = parseFlags(["my-app"]);
    expect(projectName).toBe("my-app");
    expect(flags.yes).toBe(false);
  });

  it("parses --db=docker", () => {
    const { flags } = parseFlags(["--db=docker"]);
    expect(flags.db).toBe("docker");
  });

  it("parses --db=url", () => {
    const { flags } = parseFlags(["--db=url"]);
    expect(flags.db).toBe("url");
  });

  it("parses --db=skip", () => {
    const { flags } = parseFlags(["--db=skip"]);
    expect(flags.db).toBe("skip");
  });

  it("parses --db-url and sets db=url", () => {
    const { flags } = parseFlags(["--db-url=postgresql://localhost/mydb"]);
    expect(flags.db).toBe("url");
    expect(flags.dbUrl).toBe("postgresql://localhost/mydb");
  });

  it("parses --resend-key", () => {
    const { flags } = parseFlags(["--resend-key=re_test_abc"]);
    expect(flags.resendKey).toBe("re_test_abc");
  });

  it("parses --email-from", () => {
    const { flags } = parseFlags(["--email-from=noreply@example.com"]);
    expect(flags.emailFrom).toBe("noreply@example.com");
  });

  it("parses --sails with comma-separated values", () => {
    const { flags } = parseFlags(["--sails=stripe,google-oauth"]);
    expect(flags.sails).toEqual(["stripe", "google-oauth"]);
  });

  it("parses --sails with single value", () => {
    const { flags } = parseFlags(["--sails=stripe"]);
    expect(flags.sails).toEqual(["stripe"]);
  });

  it("parses combined flags", () => {
    const { projectName, flags } = parseFlags([
      "my-app",
      "--yes",
      "--db=docker",
      "--sails=stripe,google-oauth",
      "--resend-key=re_test",
      "--email-from=noreply@x.com",
    ]);

    expect(projectName).toBe("my-app");
    expect(flags.yes).toBe(true);
    expect(flags.db).toBe("docker");
    expect(flags.sails).toEqual(["stripe", "google-oauth"]);
    expect(flags.resendKey).toBe("re_test");
    expect(flags.emailFrom).toBe("noreply@x.com");
  });

  it("ignores unknown flags gracefully", () => {
    const { flags } = parseFlags(["--unknown-flag=value", "--yes"]);
    expect(flags.yes).toBe(true);
  });

  it("returns empty flags for empty args", () => {
    const { projectName, flags } = parseFlags([]);
    expect(projectName).toBeUndefined();
    expect(flags.yes).toBe(false);
    expect(flags.db).toBeUndefined();
    expect(flags.sails).toBeUndefined();
  });

  it("filters empty strings from sails", () => {
    const { flags } = parseFlags(["--sails=,"]);
    expect(flags.sails).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// runPrompts (non-interactive / --yes mode)
// ---------------------------------------------------------------------------

describe("runPrompts with --yes flag", () => {
  it("returns default config with --yes and no project name", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = await runPrompts(undefined, { yes: true });

    expect(config.projectName).toBe("my-app");
    expect(config.displayName).toBe("My App");
    expect(config.description).toBe("My App — built with keel");
    expect(config.databaseSetup).toBe("docker");
    expect(config.databaseUrl).toContain("postgresql://");
    expect(config.databaseUrl).toContain("my_app");
    expect(config.resendApiKey).toBe("");
    expect(config.emailFrom).toBe("");
    expect(config.betterAuthSecret).toBeTruthy();
    expect(config.betterAuthSecret.length).toBeGreaterThan(0);
    expect(config.sails).toEqual([]);

    consoleSpy.mockRestore();
  });

  it("uses provided project name with --yes", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = await runPrompts("cool-project", { yes: true });

    expect(config.projectName).toBe("cool-project");
    expect(config.displayName).toBe("Cool Project");
    expect(config.databaseUrl).toContain("cool_project");

    consoleSpy.mockRestore();
  });

  it("sanitizes project name", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = await runPrompts("My Cool App!", { yes: true });

    // sanitize: lowercase -> replace non-alnum with - -> strip leading/trailing -
    expect(config.projectName).toBe("my-cool-app");

    consoleSpy.mockRestore();
  });

  it("uses provided flags", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = await runPrompts("test-proj", {
      yes: true,
      db: "url",
      dbUrl: "postgresql://custom:pass@host/db",
      resendKey: "re_test",
      emailFrom: "hello@example.com",
      sails: ["stripe", "google-oauth"],
    });

    expect(config.databaseSetup).toBe("url");
    expect(config.databaseUrl).toBe("postgresql://custom:pass@host/db");
    expect(config.resendApiKey).toBe("re_test");
    expect(config.emailFrom).toBe("hello@example.com");
    expect(config.sails).toEqual(["stripe", "google-oauth"]);

    consoleSpy.mockRestore();
  });

  it("generates a unique betterAuthSecret each time", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config1 = await runPrompts("app1", { yes: true });
    const config2 = await runPrompts("app2", { yes: true });

    expect(config1.betterAuthSecret).not.toBe(config2.betterAuthSecret);
    // Should be a hex string (64 chars for 32 bytes)
    expect(config1.betterAuthSecret).toMatch(/^[a-f0-9]{64}$/);

    consoleSpy.mockRestore();
  });

  it("constructs docker database URL from project name", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = await runPrompts("my-cool-app", {
      yes: true,
      db: "docker",
    });

    expect(config.databaseUrl).toBe(
      "postgresql://postgres:postgres@localhost:5432/my_cool_app",
    );

    consoleSpy.mockRestore();
  });

  it("handles skip database setup", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const config = await runPrompts("test", {
      yes: true,
      db: "skip",
    });

    expect(config.databaseSetup).toBe("skip");
    expect(config.databaseUrl).toBe("");

    consoleSpy.mockRestore();
  });
});
