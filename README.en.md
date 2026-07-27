# IFX Format

[Español](README.md) · [English](README.en.md)

**Cursor** / VS Code extension that formats **Informix SPL** procedures (`DEFINE`, `LET`, `IF`/`ELSE`/`END IF`, `FOR`/`FOREACH`, queries, subqueries) and highlights parameters and variables in the editor.

**ID:** `emanuelmanga.ifx-format` · **Version:** `0.2.8`

## Does it conflict with other `.sql` (Postgres, etc.)?

No, by design. This extension uses its **own language ID**: `informix-spl`.

| File extension | Language ID | Who formats |
| --- | --- | --- |
| `.ifs`, `.ifx`, `.spl` | `informix-spl` | IFX Format (automatic) |
| `.sql` | `sql` (VS Code default) | Your Postgres / generic SQL formatters |

For **Informix-only** projects, associate `.sql` with the Informix dialect in workspace settings:

```json
{
  "files.associations": {
    "*.sql": "informix-spl"
  }
}
```

That way it won't clash with formatters registered on `sql`.

## Bun: faster / lighter?

| Topic | Reality |
| --- | --- |
| Extension runtime | Still the **Extension Host Node** (Electron). Bun does **not** run inside VS Code/Cursor. |
| Bun here | Toolchain: TypeScript → minified CJS bundle (`dist/extension.cjs`), fast CLI, build/publish scripts. |
| Format speed | Dominated by the algorithm (lines + regex), not the runtime. The minified bundle helps a bit with **startup** and `.vsix` size. |
| Native binary | Not applicable for editor extensions. |

Summary: Bun is for **developing and packaging** better; the in-editor formatter is plain JS with no runtime deps.

## Requirements

- Cursor or VS Code `>= 1.74`
- [Bun](https://bun.com/) for build / CLI / packaging

## Development

```bash
bun install
bun run build          # → dist/extension.cjs (minified)
bun run watch          # rebuild when editing src/
```

Debug: `F5` → Extension Development Host.

## Local install

```bash
chmod +x scripts/install-extension.sh
./scripts/install-extension.sh
# Ctrl+Shift+P → Developer: Reload Window
```

Or package a `.vsix`:

```bash
bun run package
# then: Install from VSIX...
```

## Usage

1. Open a `.ifs` / `.ifx` / `.spl` file (or `.sql` associated to `informix-spl`)
2. **Format Document** (`Shift+Alt+F`) or format on save
3. Command: `IFX Format: Format Document` (also forces the language ID if needed)

### Format settings

| Setting | Default | Description |
| --- | --- | --- |
| `ifxFormat.uppercase` | `true` | Uppercase keywords |
| `ifxFormat.indentSize` | `2` | Spaces per level |
| `ifxFormat.useTabs` | `false` | Tabs instead of spaces |
| `ifxFormat.blankAfterQuery` | `true` | Blank line after queries |
| `ifxFormat.blankAfterIf` | `true` | Blank line after `IF`/`ELSE`/`END IF` |
| `ifxFormat.blankAfterReturning` | `true` | Blank line after `RETURNING` |
| `ifxFormat.blankBeforeElseEndIf` | `true` | Blank line before `ELSE`/`END IF` |
| `ifxFormat.keepEndClosersTogether` | `true` | Keep stacked closers together |

### Syntax highlight settings

Colors `CREATE PROCEDURE` parameters and `DEFINE` variables on every occurrence (on top of the TextMate grammar).

| Setting | Default | Description |
| --- | --- | --- |
| `ifxFormat.syntax.highlightVariables` | `true` | Enable parameter/variable highlight |
| `ifxFormat.syntax.parameterColor` | `#FBBF24` | Parameter color |
| `ifxFormat.syntax.localColor` | `#2DD4BF` | Local variable color |

## CLI

```bash
bun run format-file -- input.ifs output.ifs
# in-place:
bun run format-file -- my_proc.spl
```

## Publish to the Marketplace

See [PUBLISH.md](PUBLISH.md) (Spanish) or [PUBLISH.en.md](PUBLISH.en.md) (English).

## Layout

```text
src/extension.ts              # activation + formatter + highlighter
src/formatter.ts              # Informix SPL engine
src/highlight.ts              # parameter/variable decorations
src/highlight-parse.ts        # DEFINE / parameter name parsing
scripts/build.ts              # bun build → dist/extension.cjs
scripts/format-cli.ts
scripts/install-extension.sh
syntaxes/                     # TextMate grammar
public/assets/icon/           # extension + language icons
language-configuration.json
dist/extension.cjs            # build output (do not edit by hand)
samples/test.spl              # sample
```

## License

MIT
