import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";

// ---------------------------------------------------------------------------
// Health Route Tests
// ---------------------------------------------------------------------------

describe("health route", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = express();
    const healthModule = await import("../routes/health.js");
    app.use("/api/health", healthModule.default);
  });

  it("GET /api/health returns status ok with db connected", async () => {
    const res = await makeRequest(app, "GET", "/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("connected");
    expect(res.body.timestamp).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Profile Route Tests
// ---------------------------------------------------------------------------

// Mock the database module
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockWhere = vi.fn();
const mockReturning = vi.fn();

vi.mock("../db/index.js", () => ({
  db: {
    execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    update: () => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test mock
      set: (data: any) => ({
        where: () => ({
          returning: () =>
            Promise.resolve([
              {
                id: "user-1",
                name: data.name ?? "Test User",
                email: "test@example.com",
                emailVerified: true,
                image: data.image ?? null,
                createdAt: new Date("2024-01-01"),
                updatedAt: new Date(),
              },
            ]),
        }),
      }),
    }),
  },
  closeDb: vi.fn(),
}));

vi.mock("../db/schema/index.js", () => ({
  users: { id: "id" },
}));

vi.mock("../lib/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), fatal: vi.fn() },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    if (req.headers["x-test-skip-auth"]) {
      req.user = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };
      req.session = {
        id: "session-1",
        userId: "user-1",
        token: "test-token",
        expiresAt: new Date(Date.now() + 86400000),
        ipAddress: "127.0.0.1",
        userAgent: "test",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      next();
    } else {
      _res.status(401).json({ error: "Unauthorized" });
    }
  },
}));

describe("profile route", () => {
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());

    const profileModule = await import("../routes/profile.js");
    app.use("/api/profile", profileModule.default);
  });

  it("GET /api/profile returns 401 without auth", async () => {
    const res = await makeRequest(app, "GET", "/api/profile");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("GET /api/profile returns user when authenticated", async () => {
    const res = await makeRequest(app, "GET", "/api/profile", {
      headers: { "x-test-skip-auth": "true" },
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.id).toBe("user-1");
    expect(res.body.user.email).toBe("test@example.com");
  });

  it("PATCH /api/profile returns 401 without auth", async () => {
    const res = await makeRequest(app, "PATCH", "/api/profile", {
      body: { name: "New Name" },
    });
    expect(res.status).toBe(401);
  });

  it("PATCH /api/profile updates name when authenticated", async () => {
    const res = await makeRequest(app, "PATCH", "/api/profile", {
      headers: { "x-test-skip-auth": "true" },
      body: { name: "Updated Name" },
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
  });

  it("PATCH /api/profile rejects invalid name (empty)", async () => {
    const res = await makeRequest(app, "PATCH", "/api/profile", {
      headers: { "x-test-skip-auth": "true" },
      body: { name: "" },
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("PATCH /api/profile rejects name exceeding 100 characters", async () => {
    const res = await makeRequest(app, "PATCH", "/api/profile", {
      headers: { "x-test-skip-auth": "true" },
      body: { name: "a".repeat(101) },
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/profile rejects invalid image URL", async () => {
    const res = await makeRequest(app, "PATCH", "/api/profile", {
      headers: { "x-test-skip-auth": "true" },
      body: { image: "not-a-url" },
    });
    expect(res.status).toBe(400);
  });

  it("PATCH /api/profile accepts valid image URL", async () => {
    const res = await makeRequest(app, "PATCH", "/api/profile", {
      headers: { "x-test-skip-auth": "true" },
      body: { image: "https://example.com/photo.jpg" },
    });
    expect(res.status).toBe(200);
  });

  it("PATCH /api/profile accepts empty body (no updates)", async () => {
    const res = await makeRequest(app, "PATCH", "/api/profile", {
      headers: { "x-test-skip-auth": "true" },
      body: {},
    });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Simple request helper (no external deps needed)
// ---------------------------------------------------------------------------

async function makeRequest(
  app: express.Express,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  options: {
    headers?: Record<string, string>;
    body?: unknown;
  } = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test helper returns dynamic response shapes
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        throw new Error("Failed to bind server");
      }

      const url = `http://127.0.0.1:${addr.port}${path}`;
      const headers: Record<string, string> = {
        ...options.headers,
      };

      if (options.body) {
        headers["Content-Type"] = "application/json";
      }

      const body = options.body ? JSON.stringify(options.body) : undefined;
      fetch(url, {
        method,
        headers,
        ...(body ? { body } : {}),
      })
        .then(async (res) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic response body
          let body: any;
          try {
            body = await res.json();
          } catch {
            body = {};
          }
          server.close();
          resolve({ status: res.status, body });
        })
        .catch((err) => {
          server.close();
          throw err;
        });
    });
  });
}
