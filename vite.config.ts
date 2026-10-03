import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { realpathSync } from "node:fs";
import { defineConfig, searchForWorkspaceRoot } from "vite";

// While @bedrock-engineer/ags-parse is a `file:` link into the ags-parse-rs
// checkout, its .wasm lives outside this project and Vite's dev server must be
// allowed to serve it. Harmless once the package comes from npm.
function linkedPackagePaths(): Array<string> {
  const out: Array<string> = [];
  for (const name of ["ags-parse", "crs-index", "crs-picker"]) {
    try {
      out.push(realpathSync(`node_modules/@bedrock-engineer/${name}`));
    } catch {
      // not linked: a regular install, nothing to allow
    }
  }
  return out;
}

export default defineConfig({
  build: {
    outDir: "build/client",
  },
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), ...linkedPackagePaths()],
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  // The parser package resolves its .wasm with `new URL(..., import.meta.url)`
  // and maplibre-gl loads its worker the same way; the dependency optimizer
  // breaks both in dev, so they are served as plain ESM.
  optimizeDeps: {
    exclude: ["@bedrock-engineer/ags-parse", "@bedrock-engineer/crs-index", "@bedrock-engineer/crs-picker", "maplibre-gl"],
  },
});
