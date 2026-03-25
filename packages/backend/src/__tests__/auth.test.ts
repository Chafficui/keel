import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the auth module before importing the middleware
const mockGetSession = vi.fn();

vi.mock("../auth/index.js", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

// Import after mock setup
const { requireAuth } = await import("../middleware/auth.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(overrides: Partial<{
  headers: Record<string, string | undefined>;
}> = {}): any {
  return {
    headers: overrides.headers ?? {},
  };
}

function createMockResponse(): any {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session exists", async () => {
    mockGetSession.mockResolvedValue(null);

    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() and attaches user/session when session is valid", async () => {
    const mockSession = {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      session: {
        id: "session-1",
        userId: "user-1",
        token: "abc123",
        expiresAt: new Date(Date.now() + 86400000),
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    mockGetSession.mockResolvedValue(mockSession);

    const req = createMockRequest({
      headers: { cookie: "session=abc" },
    });
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual(mockSession.user);
    expect(req.session).toEqual(mockSession.session);
  });

  it("forwards Authorization header (Bearer token) for Capacitor", async () => {
    const mockSession = {
      user: { id: "user-1", name: "Test", email: "t@t.com", emailVerified: true, image: null, createdAt: new Date(), updatedAt: new Date() },
      session: { id: "s-1", userId: "user-1", token: "tok", expiresAt: new Date(Date.now() + 86400000), ipAddress: null, userAgent: null, createdAt: new Date(), updatedAt: new Date() },
    };
    mockGetSession.mockResolvedValue(mockSession);

    const req = createMockRequest({
      headers: {
        authorization: "Bearer my-token",
        "x-platform": "capacitor",
      },
    });
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();

    // Verify that getSession was called with headers containing the Authorization
    const callArgs = mockGetSession.mock.calls[0]![0] as { headers: Headers };
    expect(callArgs.headers.get("authorization")).toBe("Bearer my-token");
  });

  it("forwards cookie header as fallback", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", name: "U", email: "u@u.com", emailVerified: true, image: null, createdAt: new Date(), updatedAt: new Date() },
      session: { id: "s1", userId: "u1", token: "t", expiresAt: new Date(Date.now() + 86400000), ipAddress: null, userAgent: null, createdAt: new Date(), updatedAt: new Date() },
    });

    const req = createMockRequest({
      headers: { cookie: "better-auth.session_token=abc123" },
    });
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuth(req, res, next);

    const callArgs = mockGetSession.mock.calls[0]![0] as { headers: Headers };
    expect(callArgs.headers.get("cookie")).toBe("better-auth.session_token=abc123");
    expect(next).toHaveBeenCalled();
  });

  it("returns 401 when getSession throws an error", async () => {
    mockGetSession.mockRejectedValue(new Error("Session error"));

    const req = createMockRequest({
      headers: { cookie: "session=abc" },
    });
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("handles request with both Bearer and cookie headers", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "u1", name: "U", email: "u@u.com", emailVerified: true, image: null, createdAt: new Date(), updatedAt: new Date() },
      session: { id: "s1", userId: "u1", token: "t", expiresAt: new Date(Date.now() + 86400000), ipAddress: null, userAgent: null, createdAt: new Date(), updatedAt: new Date() },
    });

    const req = createMockRequest({
      headers: {
        authorization: "Bearer my-token",
        cookie: "session=cookie-val",
      },
    });
    const res = createMockResponse();
    const next = vi.fn();

    await requireAuth(req, res, next);

    // Both should be forwarded, Bearer takes priority in auth resolution
    const callArgs = mockGetSession.mock.calls[0]![0] as { headers: Headers };
    expect(callArgs.headers.get("authorization")).toBe("Bearer my-token");
    expect(callArgs.headers.get("cookie")).toBe("session=cookie-val");
    expect(next).toHaveBeenCalled();
  });
});
