import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "life.arshnaz.app",
  appName: "ARSHNAZ",
  webDir: "dist",
  loggingBehavior: "none",
  android: {
    backgroundColor: "#F6F0E8",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
    SplashScreen: {
      backgroundColor: "#F6F0E8",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
