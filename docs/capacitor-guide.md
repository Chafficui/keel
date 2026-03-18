# Capacitor Integration Guide

This guide covers using Capacitor to build native iOS and Android apps from the keel web application.

## Overview

Capacitor wraps the web app in a native WebView, providing access to native device APIs (camera, filesystem, push notifications) through JavaScript plugins. The same codebase serves web, iOS, and Android.

## Development Workflow

### Web Development

Standard web development with Vite:

```bash
# Start the dev server
npm run dev

# Access at http://localhost:5173
```

### Live Reload on Device

Run the web app with live reload, served to a native device or emulator:

```bash
# Build the web app and sync to native projects
cd packages/frontend
npx cap sync

# Open in Xcode (iOS)
npx cap open ios

# Open in Android Studio (Android)
npx cap open android
```

For live reload during development:

```bash
# Start Vite dev server
npm run dev

# In another terminal, run with live reload
cd packages/frontend
npx cap run ios --livereload --external
npx cap run android --livereload --external
```

The `--external` flag serves the dev server on your local network IP so the device can access it.

### Native Build

For production builds:

```bash
# Build the web app
cd packages/frontend
npm run build

# Sync web assets to native projects
npx cap sync

# Build native apps
npx cap open ios    # Build in Xcode
npx cap open android # Build in Android Studio
```

## Platform Detection

Detect the current platform to conditionally apply platform-specific behavior:

```typescript
import { Capacitor } from "@capacitor/core";

// Check if running in a native app
const isNative = Capacitor.isNativePlatform();

// Get the specific platform
const platform = Capacitor.getPlatform();
// Returns: "web" | "ios" | "android"

// Example: conditional behavior
if (platform === "ios") {
  // iOS-specific logic
} else if (platform === "android") {
  // Android-specific logic
} else {
  // Web-specific logic
}
```

### Common Uses for Platform Detection

- **Auth method**: Cookies (web) vs Bearer tokens (native)
- **Navigation**: Browser back button vs native gesture handling
- **File paths**: Web URLs vs native file:// URLs
- **Keyboard handling**: Virtual keyboard insets on mobile
- **Status bar**: Styling the native status bar
- **Safe areas**: Handling notch/dynamic island on iOS

## Deep Linking

Deep linking allows external URLs or other apps to open specific pages in your app.

### Configuration

**capacitor.config.ts:**
```typescript
const config: CapacitorConfig = {
  appId: "com.keel.myapp",
  appName: "My App",
  webDir: "dist",
  server: {
    // For production, don't set url (uses bundled assets)
    // For development with live reload:
    // url: "http://192.168.1.100:5173",
  },
  plugins: {
    // Deep link configuration
  },
};
```

**iOS (Info.plist):**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>
```

**Android (AndroidManifest.xml):**
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="myapp" />
</intent-filter>
```

### Handling Deep Links

```typescript
import { App } from "@capacitor/app";

App.addListener("appUrlOpen", (event) => {
  // event.url = "myapp://settings/profile"
  const path = new URL(event.url).pathname;
  router.navigate(path);
});
```

### Universal Links / App Links

For production, use Universal Links (iOS) and App Links (Android) to handle `https://` URLs:

1. Host an `apple-app-site-association` file on your domain
2. Host a `.well-known/assetlinks.json` file on your domain
3. Configure the native projects to handle your domain

## Camera Usage (Profile Pictures)

The template supports profile picture uploads using the device camera or photo library:

```typescript
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

async function takeProfilePicture() {
  const photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: true,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt, // Shows camera/library choice
    width: 400,
    height: 400,
  });

  // Upload the base64 image to your backend
  const response = await fetch("/api/user/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: photo.base64String }),
  });

  return response.json();
}
```

### Required Permissions

**iOS (Info.plist):**
```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access so you can take a profile picture.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access so you can choose a profile picture.</string>
```

**Android (AndroidManifest.xml):**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

## Auth in Native WebView

### Cookie-based (Default)

The native WebView supports cookies. If your API and frontend share the same origin (or are proxied), cookies work automatically. This is the simplest approach.

**Capacitor config for same-origin:**
```typescript
const config: CapacitorConfig = {
  server: {
    // In production, the backend should proxy the frontend
    // or both should be on the same domain
  },
};
```

### Bearer Token (Cross-origin)

If cookies don't work reliably in your setup, use Bearer tokens:

```typescript
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

// After successful login, store the token
async function onLoginSuccess(sessionToken: string) {
  if (Capacitor.isNativePlatform()) {
    await Preferences.set({ key: "session_token", value: sessionToken });
  }
}

// Create an API client that attaches the token
async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  if (Capacitor.isNativePlatform()) {
    const { value } = await Preferences.get({ key: "session_token" });
    if (value) {
      headers.set("Authorization", `Bearer ${value}`);
    }
  }

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: Capacitor.isNativePlatform() ? "omit" : "include",
  });
}

// On logout, clear the stored token
async function onLogout() {
  if (Capacitor.isNativePlatform()) {
    await Preferences.remove({ key: "session_token" });
  }
}
```

### BetterAuth Trusted Origins

Ensure your BetterAuth config includes the native WebView origins:

```typescript
trustedOrigins: [
  process.env.FRONTEND_URL!,
  "capacitor://localhost",  // iOS WebView
  "http://localhost",       // Android WebView
],
```

## Building for App Store / Play Store

### iOS (App Store)

1. **Apple Developer Account** ($99/year) at https://developer.apple.com
2. **Certificates and Provisioning Profiles** — set up in Xcode
3. **App Store Connect** — create an app listing

```bash
# Build for release
cd packages/frontend
npm run build
npx cap sync ios
npx cap open ios
# In Xcode: Product > Archive > Distribute App
```

### Android (Play Store)

1. **Google Play Developer Account** ($25 one-time) at https://play.google.com/console
2. **Signing key** — generate a release keystore

```bash
# Build for release
cd packages/frontend
npm run build
npx cap sync android
npx cap open android
# In Android Studio: Build > Generate Signed Bundle / APK
```

### Pre-submission Checklist

- [ ] App icon set (all sizes for iOS and Android)
- [ ] Splash screen configured
- [ ] Privacy policy URL added to app listing
- [ ] Push notification entitlement (if using push notifications)
- [ ] Camera/photo permission descriptions set
- [ ] App version and build number incremented
- [ ] All debug logging removed
- [ ] API URLs pointing to production
- [ ] Deep links / universal links configured
- [ ] Tested on physical devices (both platforms)

## Common Issues and Solutions

### Issue: White screen on app launch

**Cause:** The web assets are not synced to the native project.
**Solution:**
```bash
cd packages/frontend
npm run build
npx cap sync
```

### Issue: API calls fail in native app

**Cause:** CORS or cookie issues with cross-origin requests.
**Solution:**
1. Ensure your backend allows the native origins (`capacitor://localhost`, `http://localhost`)
2. Add these to BetterAuth's `trustedOrigins`
3. Add CORS headers for these origins

### Issue: Keyboard pushes content off screen (iOS)

**Cause:** The WebView resizes when the keyboard appears.
**Solution:** Add to `capacitor.config.ts`:
```typescript
ios: {
  contentInset: "automatic",
  scrollEnabled: false,
},
```

Or handle keyboard events manually:
```typescript
import { Keyboard } from "@capacitor/keyboard";

Keyboard.addListener("keyboardWillShow", (info) => {
  document.body.style.paddingBottom = `${info.keyboardHeight}px`;
});

Keyboard.addListener("keyboardWillHide", () => {
  document.body.style.paddingBottom = "0px";
});
```

### Issue: Status bar overlaps content (iOS)

**Cause:** The WebView extends behind the status bar.
**Solution:** Use CSS safe area insets:
```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### Issue: Back button closes the app (Android)

**Cause:** Android's hardware back button exits the WebView.
**Solution:**
```typescript
import { App } from "@capacitor/app";

App.addListener("backButton", ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    App.exitApp();
  }
});
```

### Issue: Live reload not connecting to device

**Cause:** Device and dev machine are on different networks, or firewall blocks the connection.
**Solution:**
1. Ensure device and machine are on the same Wi-Fi network
2. Use `--external` flag: `npx cap run ios --livereload --external`
3. Check firewall settings (port 5173 must be accessible)

### Issue: Native plugin not working

**Cause:** Plugin not installed or not synced.
**Solution:**
```bash
npm install @capacitor/<plugin-name>
npx cap sync
```

For iOS, you may need to run `pod install`:
```bash
cd packages/frontend/ios/App
pod install
```
