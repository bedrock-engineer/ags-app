# Bedrock AGS viewer

Free, open-source web application for viewing AGS3 and AGS4 ground investigation files in the
browser: locations on a map, every group as a table, parse issues, borehole logs, and downloads
as Excel (one sheet per group), GeoJSON and Arrow. Nothing is uploaded; parsing runs in
WebAssembly with [ags-parse](https://github.com/bedrock-engineer/ags-parse-rs).

## Stack

The same shape as [bro-xml-app](https://github.com/bedrock-engineer/bro-xml-app): React Router 8
(framework mode, server rendering on Cloudflare Workers), Vite 8, TypeScript, Tailwind CSS 4,
react-aria-components, MapLibre GL with OpenFreeMap tiles, Observable Plot, apache-arrow.

```sh
npm install
npm run dev          # http://localhost:5173
npm run typecheck && npm run lint && npm run knip
npm run build        # build/client + build/server
npm run deploy       # wrangler deploy
```

Until `@bedrock-engineer/ags-parse` is on npm, `package.json` points at the locally built package
in `../ags-parse-rs/crates/ags-parse-wasm/pkg` (build it with `./build.sh` there).

## Sample data

`public/samples/` holds one AGS3 file from Kai Tak, Hong Kong (Hong Kong GEO open data) and one
AGS4 file from the British Geological Survey's Royal Victoria Dock North deposit (Open Government
Licence; contains data supplied by UKRI).

## License

Apache 2.0.
