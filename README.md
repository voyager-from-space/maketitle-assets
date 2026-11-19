# maketitle-assets

Static files for [maketitle](https://github.com/voyager-from-space/maketitle): the BusyTeX WebAssembly engines and TeX Live data packages it loads in the browser.

- `parts/` holds each large file as one gzip stream cut into 80 MB parts (GitHub Pages rejects files over 100 MB). The app downloads the parts in order and gunzips them in the browser with `DecompressionStream`.
- `manifest.json` lists each file with its raw size, gzip size and parts.
- `prep.sh` rebuilds this tree from a BusyTeX build directory.

The engines and packages come from [texlyre-busytex](https://github.com/TeXlyre/texlyre-busytex) / [BusyTeX](https://github.com/busytex/busytex) (AGPL-3.0, with TeX Live 2026 packages under their own licences). This repository is served through GitHub Pages so the browser can fetch the files cross-origin.

- `core/` holds the BusyTeX JavaScript and the TeX Live data-package loaders (small files, served as they are) plus `worker-shim.js`, the entry both maketitle and [papershed](https://github.com/voyager-from-space/papershed) use. An app serves a one-line same-origin worker that sets `self.__MT_ASSETS__` to this site's URL and calls `importScripts()` on the shim. The shim answers the engine's requests for the big `.data` and `.wasm` files from `parts/`, and posts `{ mt_net: bytes }` so the app can show download progress. The scripts in `core/` come from BusyTeX / texlyre-busytex (AGPL-3.0); `worker-shim.js` is ours, AGPL-3.0-or-later.
