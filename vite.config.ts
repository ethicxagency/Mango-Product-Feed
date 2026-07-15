import { vitePlugin as remix } from "@remix-run/dev";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// v3_singleFetch is intentionally NOT enabled: it routes data through
// turbo-stream, which has an open high-severity DoS advisory
// (GHSA-rxv8-25v2-qmq8) against the version Remix 2.17.x pins. Staying on
// the classic per-route data loading avoids that code path entirely.
export default defineConfig({
  server: {
    port: 3000,
    strictPort: true,
  },
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tailwindcss(),
    tsconfigPaths(),
  ],
});
