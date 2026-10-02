import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "build/client",
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  // The parser is a wasm-bindgen package loaded with `init(url)`: keep it out
  // of dependency pre-bundling and let the .wasm go through as an asset.
  assetsInclude: ["**/*.wasm"],
  optimizeDeps: {
    exclude: ["@bedrock-engineer/ags-parse"],
  },
});
