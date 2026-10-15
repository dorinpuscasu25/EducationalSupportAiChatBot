import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const DEV_API_TARGET =
    process.env.VITE_DEV_API_TARGET ??
    env.VITE_DEV_API_TARGET ??
    "http://127.0.0.1:3380";

  return {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      tsconfigPaths(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      svgr(),
    ],
    server: {
      // Dev proxy so the browser talks to one origin: no CORS preflight, and the
      // backend keeps its production allow-list. Point VITE_API_URL at "/api".
      //
      // changeOrigin only rewrites Host. The backend also checks Origin and
      // answers 403 origin_not_allowed for http://localhost:5173, so send the
      // origin it expects. The browser still sees a same-origin request, so
      // nothing here weakens the real CORS policy.
      proxy: Object.fromEntries(
        ["/api", "/uploads"].map((path) => [
          path,
          {
            target: DEV_API_TARGET,
            changeOrigin: true,
            headers: { Origin: DEV_API_TARGET },
          },
        ]),
      ),
    },
  };
});
