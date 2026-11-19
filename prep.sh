#!/bin/sh
# Builds the asset tree from a BusyTeX build directory: big files become gzip streams split into <=80 MB parts,
# everything else is copied as is. Writes manifest.json (name -> raw size, gz size, parts).
set -e
SRC="$1"; OUT="$2"
mkdir -p "$OUT/parts" "$OUT/small"
: > "$OUT/manifest.tmp"
for f in texlive-basic.data texlive-recommended.data texlive-extra.data busytex.wasm biber.wasm biber.data; do
  gzip -9 -c "$SRC/$f" > "$OUT/$f.gz"
  raw=$(stat -c %s "$SRC/$f"); gz=$(stat -c %s "$OUT/$f.gz")
  split -b 80000000 -d -a 2 "$OUT/$f.gz" "$OUT/parts/$f.gz."
  rm "$OUT/$f.gz"
  parts=$(ls "$OUT/parts" | grep "^$f.gz\." | sort | sed 's/.*/"&"/' | paste -sd, -)
  echo "\"$f\":{\"size\":$raw,\"gz\":$gz,\"parts\":[$parts]}" >> "$OUT/manifest.tmp"
done
echo "{$(paste -sd, "$OUT/manifest.tmp")}" > "$OUT/manifest.json"; rm "$OUT/manifest.tmp"
for f in "$SRC"/*; do
  b=$(basename "$f")
  case "$b" in texlive-basic.data|texlive-recommended.data|texlive-extra.data|busytex.wasm|biber.wasm|biber.data) ;; *) cp "$f" "$OUT/small/$b";; esac
done
