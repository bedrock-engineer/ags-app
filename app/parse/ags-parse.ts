/**
 * Loads the ags-parse WebAssembly module once. Client only. The package is
 * built with wasm-pack's `web` target, whose `init()` fetches
 * `ags_parse_bg.wasm` from next to its own JS module; Vite resolves that
 * `new URL(..., import.meta.url)` to a hashed asset in production.
 */
import type * as AgsParse from "@bedrock-engineer/ags-parse";

type AgsParseModule = typeof AgsParse;

let loading: Promise<AgsParseModule> | undefined;

export function loadAgsParse(): Promise<AgsParseModule> {
  loading ??= (async () => {
    const mod = await import("@bedrock-engineer/ags-parse");
    await mod.default();
    return mod;
  })();
  return loading;
}
