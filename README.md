# maketitle-assets

Static files for [maketitle](https://github.com/voyager-from-space/maketitle): the BusyTeX WebAssembly engines and TeX Live data packages it loads in the browser.

- `parts/` holds each large file as one gzip stream cut into 80 MB parts (GitHub Pages rejects files over 100 MB). The app downloads the parts in order and gunzips them in the browser with `DecompressionStream`.
- `manifest.json` lists each file with its raw size, gzip size and parts.
- `prep.sh` rebuilds this tree from a BusyTeX build directory.

The engines and packages come from [texlyre-busytex](https://github.com/TeXlyre/texlyre-busytex) / [BusyTeX](https://github.com/busytex/busytex) (AGPL-3.0, with TeX Live 2026 packages under their own licences). This repository is served through GitHub Pages so the browser can fetch the files cross-origin.
