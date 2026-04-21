import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Toilet Feedback Panel",
        short_name: "Toilet Panel",
        description: "Restroom feedback kiosk",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "landscape",
        background_color: "#0d1f12",
        theme_color: "#0d1f12",
        lang: "en",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest,json}"],
      },
    }),
  ],
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
