// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Inside Lovable (preview + Lovable publish) the wrapper builds a Cloudflare
// Nitro worker (SSR). That output has no index.html, so a plain static host
// like AWS Amplify serves nothing and every route 404s.
//
// When building OUTSIDE the Lovable sandbox (e.g. AWS Amplify running
// `npm run build`), switch to a static SPA build instead: disable Nitro and
// enable TanStack Start SPA mode. This prerenders a hydrating shell to
// dist/client/_shell.html (copied to index.html by the postbuild script) so a
// static host can serve every route via a single-page-app fallback.
const isLovableSandbox =
  process.env.LOVABLE_SANDBOX === "1" || !!process.env.DEV_SERVER__PROJECT_PATH;

export default defineConfig(
  isLovableSandbox
    ? {
        tanstackStart: {
          // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
          // nitro/vite builds from this
          server: { entry: "server" },
        },
      }
    : {
        // Static SPA build for external static hosting (AWS Amplify, S3, etc.).
        nitro: false,
        tanstackStart: {
          spa: { enabled: true },
        },
      },
);
