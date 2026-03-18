import type { CapacitorConfig } from "@capacitor/cli";

// App icons for native platforms:
//   iOS:     ios/App/App/Assets.xcassets/AppIcon.appiconset/
//   Android: android/app/src/main/res/mipmap-*/
// Generate from your app icon using Capacitor's asset generation:
//   npx @capacitor/assets generate --iconBackgroundColor #ffffff

const config: CapacitorConfig = {
  appId: "com.example.app",
  appName: "MyApp",
  webDir: "dist",
  server: {
    // Uncomment for development live reload:
    // url: "http://192.168.1.X:5173",
    // cleartext: true,
    androidScheme: "https",
  },
};

export default config;
