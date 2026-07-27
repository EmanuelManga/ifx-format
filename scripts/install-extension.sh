#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bun run build

VERSION="$(bun -e 'console.log(require("./package.json").version)')"
DEST="${HOME}/.cursor/extensions/emanuelmanga.ifx-format-${VERSION}"

mkdir -p "$DEST"
cp -a "$ROOT/package.json" "$DEST/"
cp -a "$ROOT/LICENSE" "$DEST/" 2>/dev/null || true
cp -a "$ROOT/README.md" "$DEST/" 2>/dev/null || true
cp -a "$ROOT/language-configuration.json" "$DEST/"
cp -a "$ROOT/dist" "$DEST/"
cp -a "$ROOT/syntaxes" "$DEST/"
mkdir -p "$DEST/public/assets/icon"
cp -a "$ROOT/public/assets/icon/." "$DEST/public/assets/icon/"

echo "Installed/updated IFX Format (emanuelmanga.ifx-format) -> $DEST"
echo "Reload Cursor: Ctrl+Shift+P → Developer: Reload Window"
echo ""
echo "Tip: para .sql Informix sin pisar Postgres, en settings:"
echo '  "files.associations": { "*.sql": "informix-spl" }'
