#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bun run package

VERSION="$(bun -e 'console.log(require("./package.json").version)')"
VSIX="$ROOT/ifx-format-${VERSION}.vsix"

if ! command -v cursor >/dev/null 2>&1; then
  echo "No se encontró el CLI 'cursor'."
  echo "Instalá a mano: Extensions → Install from VSIX… → $VSIX"
  exit 1
fi

# Quitar ID viejo si quedó colgado
cursor --uninstall-extension emanuelmanga.informix-spl-formatter >/dev/null 2>&1 || true

cursor --install-extension "$VSIX" --force

echo ""
echo "Instalada IFX Format (emanuelmanga.ifx-format@${VERSION})"
echo "Reload Cursor: Ctrl+Shift+P → Developer: Reload Window"
echo ""
echo "Tip: para .sql Informix sin pisar Postgres, en settings:"
echo '  "files.associations": { "*.sql": "informix-spl" }'
