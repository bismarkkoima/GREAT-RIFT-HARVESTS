import { writeFileSync } from "fs";
import { join } from "path";
import type { CapacitorConfig } from "@capacitor/cli";

// The app is a native shell around the live website.
//
// APP_URL (set when building) is the store's address, e.g. https://greatriftharvests.co.ke.
// - Set: the app opens the store directly and only stays inside the app on that site.
// - Not set: the app opens a setup screen (www/index.html) where you type the address,
//   handy for testing against a computer on the same Wi-Fi.
const appUrl = process.env.APP_URL?.trim().replace(/\/+$/, "") || undefined;

// Lets the bundled setup/error pages know which address this build opens.
writeFileSync(join(__dirname, "www", "app-config.js"), `window.GRH_APP_URL = ${JSON.stringify(appUrl ?? null)};\n`);

const config: CapacitorConfig = {
  appId: "com.greatriftharvests.app",
  appName: "Great Rift Harvests",
  webDir: "www",
  appendUserAgent: "GreatRiftHarvestsApp",
  backgroundColor: "#fbf8f3",
  server: appUrl
    ? {
        url: appUrl,
        cleartext: appUrl.startsWith("http://"),
        allowNavigation: [new URL(appUrl).host],
        errorPath: "error.html",
      }
    : {
        allowNavigation: ["*"],
        errorPath: "error.html",
      },
  android: {
    allowMixedContent: false,
  },
};

export default config;
