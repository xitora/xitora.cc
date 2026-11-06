import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { cpSync, mkdirSync } from "node:fs";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "pdf-assets",
      writeBundle() {
        mkdirSync("dist/pdf", { recursive: true });
        for (const dir of ["cmaps", "standard_fonts", "wasm"])
          cpSync(`node_modules/pdfjs-dist/${dir}`, `dist/pdf/${dir}`, {
            recursive: true,
          });
      },
    },
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "xitora 도구",
        short_name: "xitora 도구",
        start_url: "/tools",
        display: "standalone",
        background_color: "#111116",
        theme_color: "#19191f",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          { src: "/icons/tool-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/tool-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{js,mjs,css,html,svg,png,woff2,wasm,bcmap,pfb,ttf}",
        ],
        globIgnores: [
          "assets/project-*.png",
          "assets/favicon-*.png",
          "assets/profile*.png",
        ],
        maximumFileSizeToCacheInBytes: 10000000,
        navigateFallback: "/index.html",
        navigateFallbackAllowlist: [/^\/tools(?:\/|$)/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
