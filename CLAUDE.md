# CLAUDE.md

## What this is

A client-side viewer for AGS3 and AGS4 files. All parsing happens in the browser through the
`@bedrock-engineer/ags-parse` WebAssembly package; the server only renders the shell. Modeled on
`bro-xml-app`, without i18n, analytics or error reporting.

## Layout

```
app/parse/      pure core, no React: wasm loading, Arrow tables, locations, strata, SPT, CPT
app/util/       CRS definitions and detection, downloads, formatting
app/components/ React UI; map/ags-map.client.tsx is client only (maplibre)
workers/app.ts  Cloudflare Worker entry
public/samples/ two small public AGS files for the "load samples" link
```

## Decisions

- **Arrow IPC across the wasm boundary.** The parser hands over each group as an IPC stream;
  `apache-arrow` decodes it on first use and the table is cached per file. Everything small
  (summary, issues, column metadata) crosses as plain objects.
- **The wasm module is loaded with `init(url)`** (wasm-pack `web` target) so Vite needs no wasm
  plugin and the module is a normal asset.
- **Coordinates are guessed, then overridable.** AGS files seldom say which grid `LOCA_NATE` is
  in; `util/crs.ts` guesses from the ranges (British National Grid, Hong Kong 1980, ...) and the
  user can pick another. proj4 Helmert transforms are metre-level, fine for a map.
- **Big tables are paged, not virtualized.** Groups show 200 rows at a time with a filter box.
- **Map tiles from OpenFreeMap** (no key, attribution in the footer).
- **No worker thread yet.** A 2 MB AGS4 file parses in well under a second; a 140 MB file would
  block the UI. Move parsing to a Web Worker before advertising large-file support.

## Conventions

`npm run typecheck`, `npm run lint`, `npm run build` before committing. Tailwind v4: no config
file, theme tokens in `app/app.css`. Native elements first, react-aria-components where they add
behavior (DropZone, FileTrigger, Tabs, Button).
