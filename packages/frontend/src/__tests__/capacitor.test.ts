import { describe, it, expect, vi, beforeEach } from "vitest";

describe("capacitor detection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports isNative as false on web platform", async () => {
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => false,
        getPlatform: () => "web",
      },
    }));

    const { isNative, platform, isWeb, isIOS, isAndroid } = await import(
      "../lib/capacitor.js"
    );

    expect(isNative).toBe(false);
    expect(platform).toBe("web");
    expect(isWeb).toBe(true);
    expect(isIOS).toBe(false);
    expect(isAndroid).toBe(false);
  });

  it("exports isNative as true on iOS", async () => {
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => "ios",
      },
    }));

    const { isNative, platform, isWeb, isIOS, isAndroid } = await import(
      "../lib/capacitor.js"
    );

    expect(isNative).toBe(true);
    expect(platform).toBe("ios");
    expect(isWeb).toBe(false);
    expect(isIOS).toBe(true);
    expect(isAndroid).toBe(false);
  });

  it("exports isNative as true on Android", async () => {
    vi.doMock("@capacitor/core", () => ({
      Capacitor: {
        isNativePlatform: () => true,
        getPlatform: () => "android",
      },
    }));

    const { isNative, platform, isWeb, isIOS, isAndroid } = await import(
      "../lib/capacitor.js"
    );

    expect(isNative).toBe(true);
    expect(platform).toBe("android");
    expect(isWeb).toBe(false);
    expect(isIOS).toBe(false);
    expect(isAndroid).toBe(true);
  });
});
