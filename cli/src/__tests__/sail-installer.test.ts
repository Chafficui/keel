import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Test insertAtMarker directly (exported function)
// ---------------------------------------------------------------------------

// We need to mock chalk and ora to avoid terminal output during tests
vi.mock("chalk", () => ({
  default: {
    yellow: (s: string) => s,
    cyan: (s: string) => s,
    bold: (s: string) => s,
    white: (s: string) => s,
    green: (s: string) => s,
    red: (s: string) => s,
    gray: (s: string) => s,
  },
}));

vi.mock("ora", () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
  }),
}));

const { insertAtMarker, getManualSteps } = await import("../sail-installer.js");

describe("insertAtMarker", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `keel-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
    // Clear manual steps
    getManualSteps();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("inserts code after marker comment", () => {
    const filePath = join(tempDir, "test.ts");
    writeFileSync(filePath, `import express from "express";
// [SAIL_IMPORTS]

const app = express();
// [SAIL_ROUTES]

app.listen(3000);
`);

    const result = insertAtMarker(
      filePath,
      "// [SAIL_IMPORTS]",
      'import { stripeRouter } from "./routes/stripe.js";',
    );

    expect(result).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain('import { stripeRouter } from "./routes/stripe.js";');
    // The import should appear after the marker
    const markerIndex = content.indexOf("// [SAIL_IMPORTS]");
    const importIndex = content.indexOf('import { stripeRouter }');
    expect(importIndex).toBeGreaterThan(markerIndex);
  });

  it("inserts code after JSX marker comment", () => {
    const filePath = join(tempDir, "router.tsx");
    writeFileSync(filePath, `<Route path="/" element={<Home />} />
        {/* [SAIL_ROUTES] */}
      </Route>
`);

    const result = insertAtMarker(
      filePath,
      "{/* [SAIL_ROUTES] */}",
      '          <Route path="/pricing" element={<Pricing />} />',
    );

    expect(result).toBe(true);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain('<Route path="/pricing" element={<Pricing />} />');
  });

  it("is idempotent — does not insert the same code twice", () => {
    const filePath = join(tempDir, "test.ts");
    const originalContent = `// [SAIL_IMPORTS]
const x = 1;
`;
    writeFileSync(filePath, originalContent);

    const code = 'import { foo } from "./foo.js";';

    // First insertion
    insertAtMarker(filePath, "// [SAIL_IMPORTS]", code);
    const afterFirst = readFileSync(filePath, "utf-8");

    // Second insertion — should be a no-op
    insertAtMarker(filePath, "// [SAIL_IMPORTS]", code);
    const afterSecond = readFileSync(filePath, "utf-8");

    expect(afterFirst).toBe(afterSecond);
    // Count occurrences of the code
    const matches = afterSecond.match(/import \{ foo \}/g);
    expect(matches?.length).toBe(1);
  });

  it("records manual step when marker is missing", () => {
    const filePath = join(tempDir, "test.ts");
    writeFileSync(filePath, `import express from "express";
const app = express();
`);

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = insertAtMarker(
      filePath,
      "// [SAIL_IMPORTS]",
      'import { foo } from "./foo.js";',
    );

    expect(result).toBe(false);

    const steps = getManualSteps();
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toContain('import { foo } from "./foo.js";');

    consoleSpy.mockRestore();
  });

  it("records manual step when file does not exist", () => {
    const filePath = join(tempDir, "nonexistent.ts");

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = insertAtMarker(
      filePath,
      "// [SAIL_IMPORTS]",
      'import { foo } from "./foo.js";',
    );

    expect(result).toBe(false);
    const steps = getManualSteps();
    expect(steps.length).toBeGreaterThan(0);

    consoleSpy.mockRestore();
  });

  it("preserves existing content around marker", () => {
    const filePath = join(tempDir, "test.ts");
    writeFileSync(filePath, `line1
// [SAIL_IMPORTS]
line3
line4
`);

    insertAtMarker(filePath, "// [SAIL_IMPORTS]", "inserted_line");
    const content = readFileSync(filePath, "utf-8");

    expect(content).toContain("line1");
    expect(content).toContain("// [SAIL_IMPORTS]");
    expect(content).toContain("inserted_line");
    expect(content).toContain("line3");
    expect(content).toContain("line4");
  });

  it("handles multiple markers in same file", () => {
    const filePath = join(tempDir, "test.ts");
    writeFileSync(filePath, `// [SAIL_IMPORTS]

const app = express();

// [SAIL_ROUTES]

app.listen(3000);
`);

    insertAtMarker(filePath, "// [SAIL_IMPORTS]", 'import { a } from "./a.js";');
    insertAtMarker(filePath, "// [SAIL_ROUTES]", 'app.use("/api/a", a);');

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain('import { a } from "./a.js";');
    expect(content).toContain('app.use("/api/a", a);');
  });
});

describe("getManualSteps", () => {
  it("returns accumulated steps and clears the list", () => {
    // Clear any existing steps
    getManualSteps();

    const filePath = join(tmpdir(), "nonexistent-file.ts");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    insertAtMarker(filePath, "// [MARKER]", "code1");
    insertAtMarker(filePath, "// [MARKER]", "code2");

    const steps = getManualSteps();
    expect(steps.length).toBe(2);

    // After retrieval, should be empty
    const stepsAgain = getManualSteps();
    expect(stepsAgain.length).toBe(0);

    consoleSpy.mockRestore();
  });
});
