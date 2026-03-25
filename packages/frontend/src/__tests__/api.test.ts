import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Capacitor modules
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
    getPlatform: () => "web",
  },
}));

vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
}));

const { ApiError, apiFetch, apiGet, apiPost, apiPatch, apiDelete } = await import(
  "../lib/api.js"
);

describe("ApiError", () => {
  it("has correct properties", () => {
    const error = new ApiError(404, "Not Found", { message: "Resource not found" });
    expect(error.status).toBe(404);
    expect(error.statusText).toBe("Not Found");
    expect(error.data).toEqual({ message: "Resource not found" });
    expect(error.message).toBe("API Error: 404 Not Found");
    expect(error.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    const error = new ApiError(500, "Internal Server Error");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiError);
  });

  it("works without data", () => {
    const error = new ApiError(401, "Unauthorized");
    expect(error.data).toBeUndefined();
  });
});

describe("apiFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("makes GET request with correct defaults", async () => {
    const mockResponse = { user: { id: "1", name: "Test" } };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiFetch("/api/profile");

    expect(fetch).toHaveBeenCalledWith("/api/profile", expect.objectContaining({
      credentials: "include",
      headers: expect.objectContaining({
        "Content-Type": "application/json",
      }),
    }));
    expect(result).toEqual(mockResponse);
  });

  it("throws ApiError on non-ok response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ error: "Not authenticated" }),
    });

    await expect(apiFetch("/api/profile")).rejects.toThrow(ApiError);

    try {
      await apiFetch("/api/profile");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      if (err instanceof ApiError) {
        expect(err.status).toBe(401);
        expect(err.statusText).toBe("Unauthorized");
        expect(err.data).toEqual({ error: "Not authenticated" });
      }
    }
  });

  it("handles non-JSON error response body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(apiFetch("/api/broken")).rejects.toThrow(ApiError);
  });

  it("returns undefined for 204 No Content", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error("no body")),
    });

    const result = await apiFetch("/api/resource");
    expect(result).toBeUndefined();
  });

  it("passes custom options", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });

    await apiFetch("/api/test", {
      method: "POST",
      body: JSON.stringify({ key: "value" }),
    });

    expect(fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ key: "value" }),
    }));
  });
});

describe("convenience methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("apiGet sends GET request", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: "test" }),
    });

    await apiGet("/api/test");

    expect(fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "GET",
    }));
  });

  it("apiPost sends POST request with body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });

    await apiPost("/api/test", { name: "test" });

    expect(fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    }));
  });

  it("apiPost sends POST without body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });

    await apiPost("/api/test");

    expect(fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "POST",
    }));
  });

  it("apiPatch sends PATCH request with body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ updated: true }),
    });

    await apiPatch("/api/test", { name: "updated" });

    expect(fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ name: "updated" }),
    }));
  });

  it("apiDelete sends DELETE request", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ deleted: true }),
    });

    await apiDelete("/api/test");

    expect(fetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      method: "DELETE",
    }));
  });
});
