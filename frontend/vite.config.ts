import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
      // Static SPA build for external static hosting (AWS Amplify, S3, etc.).
      // Prerenders a hydrating shell to dist/client/_shell.html, which the
      // postbuild script copies to dist/client/index.html so a static host can
      // serve every route via a single-page-app fallback.
      spa: { enabled: true },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    port: 5173,
  },
});