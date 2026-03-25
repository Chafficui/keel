import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SAILS_DIR = join(__dirname, "..", "..", "sails");
const REGISTRY_PATH = join(SAILS_DIR, "registry.json");

interface RegistrySail {
  name: string;
  displayName: string;
  description: string;
  category: string;
  version: string;
  status?: string;
}

interface Registry {
  version: string;
  sails: RegistrySail[];
}

describe("sail registry", () => {
  it("registry.json exists and is valid JSON", () => {
    expect(existsSync(REGISTRY_PATH)).toBe(true);
    const content = readFileSync(REGISTRY_PATH, "utf-8");
    const registry = JSON.parse(content);
    expect(registry).toBeDefined();
    expect(registry.version).toBeDefined();
    expect(Array.isArray(registry.sails)).toBe(true);
  });

  it("each sail has required fields", () => {
    const registry: Registry = JSON.parse(
      readFileSync(REGISTRY_PATH, "utf-8"),
    );

    for (const sail of registry.sails) {
      expect(sail.name).toBeTruthy();
      expect(sail.displayName).toBeTruthy();
      expect(sail.description).toBeTruthy();
      expect(sail.category).toBeTruthy();
      expect(sail.version).toBeTruthy();
    }
  });

  it("sail names are unique", () => {
    const registry: Registry = JSON.parse(
      readFileSync(REGISTRY_PATH, "utf-8"),
    );

    const names = registry.sails.map((s) => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it("non-planned sails have an addon.json manifest", () => {
    const registry: Registry = JSON.parse(
      readFileSync(REGISTRY_PATH, "utf-8"),
    );

    const availableSails = registry.sails.filter(
      (s) => s.status !== "planned",
    );

    for (const sail of availableSails) {
      const manifestPath = join(SAILS_DIR, sail.name, "addon.json");
      expect(
        existsSync(manifestPath),
        `Missing addon.json for sail: ${sail.name}`,
      ).toBe(true);
    }
  });

  it("non-planned sails have an install.ts file", () => {
    const registry: Registry = JSON.parse(
      readFileSync(REGISTRY_PATH, "utf-8"),
    );

    const availableSails = registry.sails.filter(
      (s) => s.status !== "planned",
    );

    for (const sail of availableSails) {
      const installPath = join(SAILS_DIR, sail.name, "install.ts");
      expect(
        existsSync(installPath),
        `Missing install.ts for sail: ${sail.name}`,
      ).toBe(true);
    }
  });

  it("addon.json manifests have valid structure", () => {
    const registry: Registry = JSON.parse(
      readFileSync(REGISTRY_PATH, "utf-8"),
    );

    const availableSails = registry.sails.filter(
      (s) => s.status !== "planned",
    );

    for (const sail of availableSails) {
      const manifestPath = join(SAILS_DIR, sail.name, "addon.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

      expect(manifest.name).toBe(sail.name);
      expect(manifest.displayName).toBeTruthy();
      expect(manifest.version).toBeTruthy();
      expect(manifest.dependencies).toBeDefined();
      expect(manifest.dependencies.backend).toBeDefined();
      expect(manifest.dependencies.frontend).toBeDefined();
      expect(manifest.modifies).toBeDefined();
      expect(manifest.adds).toBeDefined();
    }
  });

  it("contains the expected core sails", () => {
    const registry: Registry = JSON.parse(
      readFileSync(REGISTRY_PATH, "utf-8"),
    );

    const sailNames = registry.sails.map((s) => s.name);

    expect(sailNames).toContain("google-oauth");
    expect(sailNames).toContain("stripe");
    expect(sailNames).toContain("gdpr");
    expect(sailNames).toContain("r2-storage");
    expect(sailNames).toContain("push-notifications");
    expect(sailNames).toContain("analytics");
    expect(sailNames).toContain("admin-dashboard");
    expect(sailNames).toContain("i18n");
  });

  it("planned sails are correctly marked", () => {
    const registry: Registry = JSON.parse(
      readFileSync(REGISTRY_PATH, "utf-8"),
    );

    const plannedSails = registry.sails.filter(
      (s) => s.status === "planned",
    );

    // Based on the current registry, rate-limiting and file-uploads are planned
    const plannedNames = plannedSails.map((s) => s.name);
    expect(plannedNames).toContain("rate-limiting");
    expect(plannedNames).toContain("file-uploads");
  });
});
