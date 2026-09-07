import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "life.arshnaz.app",
  appName: "ARSHNAZ",
  webDir: "dist",
  android: {
    backgroundColor: "#0F172A",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
    SplashScreen: {
      backgroundColor: "#0F172A",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
