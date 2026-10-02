/**
 * Loads the ags-parse WebAssembly module once. Client only: the module is
 * fetched as an asset and initialized with `init(url)`.
 */
import type * as AgsParse from "@bedrock-engineer/ags-parse";

export type AgsParseModule = typeof AgsParse;

let loading: Promise<AgsParseModule> | undefined;

export function loadAgsParse(): Promise<AgsParseModule> {
  loading ??= (async () => {
    const [mod, wasm] = await Promise.all([
      import("@bedrock-engineer/ags-parse"),
      import("@bedrock-engineer/ags-parse/ags_parse_bg.wasm?url"),
    ]);
    await mod.default({ module_or_path: wasm.default });
    return mod;
  })();
  return loading;
}
