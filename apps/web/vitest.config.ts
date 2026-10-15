import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vitest/config";

/**
 * A config of its own rather than a `test` block in `vite.config.ts`: the
 * `tanstackRouter()` plugin there **writes `src/routeTree.gen.ts`** whenever
 * the Vite pipeline starts, and a test run must not rewrite a tracked file.
 *
 * Everything a test needs is here: the JSX transform, the path aliases, and the
 * React Compiler, so what is asserted is the artifact that ships.
 */
export default defineConfig({
  // As vite.config.ts, minus the router plugin: SVGs imported with `?react`
  // are components (the spinner in Button).
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), svgr()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // Tests sit beside the module they test.
    include: ["src/**/*.test.{ts,tsx}"],
    // No globals: explicit imports from "vitest" keep test types out of app code.
    globals: false,
    css: false,
    // Dates are formatted with the runner's zone; pin it so CI and laptops agree.
    env: { TZ: "UTC" },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/routes/**",
        "src/routeTree.gen.ts",
        "src/main.tsx",
        "src/core.tsx",
        "src/test/**",
        "src/**/*.d.ts",
      ],
    },
  },
});
