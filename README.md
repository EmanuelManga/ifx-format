# IFX Format

[Español](README.md) · [English](README.en.md)

Extensión para **Cursor** / VS Code que formatea procedimientos **Informix SPL** (`DEFINE`, `LET`, `IF`/`ELSE`/`END IF`, `FOR`/`FOREACH`, queries, subqueries) y colorea parámetros y variables en el editor.

**ID:** `emanuelmanga.ifx-format` · **Versión:** `0.2.9`

## ¿Pisa otros `.sql` (Postgres, etc.)?

No, por diseño. Esta extensión usa un **language ID propio**: `informix-spl`.

| Extensión de archivo | Language ID | Quién formatea |
| --- | --- | --- |
| `.ifs`, `.ifx`, `.spl` | `informix-spl` | IFX Format (automático) |
| `.sql` | `sql` (default VS Code) | Tus formatters de Postgres/SQL genérico |

Para proyectos **solo Informix**, asociá `.sql` al dialecto Informix en settings del workspace:

```json
{
  "files.associations": {
    "*.sql": "informix-spl"
  }
}
```

Así no chocás con formatters registrados en `sql`.

## Bun: ¿más rápido / más liviano?

| Qué | Realidad |
| --- | --- |
| Runtime de la extensión | Sigue siendo el **Node del Extension Host** (Electron). Bun **no** corre dentro de VS Code/Cursor. |
| Bun acá | Toolchain: TypeScript → bundle minificado CJS (`dist/extension.cjs`), CLI rápida, scripts de build/publish. |
| Velocidad al formatear | Domina el algoritmo (líneas + regex), no el runtime. El bundle minificado ayuda un poco al **arranque** y al tamaño del `.vsix`. |
| Compilar a binario nativo | No aplica para extensiones del editor. |

Resumen: Bun sirve para **desarrollar y empaquetar** mejor; el formatter en el editor es JS puro sin deps.

## Requisitos

- Cursor o VS Code `>= 1.74`
- [Bun](https://bun.com/) para build / CLI / packaging

## Desarrollo

```bash
bun install
bun run build          # → dist/extension.cjs (minificado)
bun run watch          # rebuild al editar src/
```

Debug: `F5` → Extension Development Host.

## Instalación local

```bash
chmod +x scripts/install-extension.sh
./scripts/install-extension.sh
# Ctrl+Shift+P → Developer: Reload Window
```

O empaquetá un `.vsix`:

```bash
bun run package
# luego: Install from VSIX...
```

## Uso

1. Abrí un `.ifs` / `.ifx` / `.spl` (o `.sql` asociado a `informix-spl`)
2. **Format Document** (`Shift+Alt+F`) o format on save
3. Comando: `IFX Format: Format Document` (también fuerza el language ID si hace falta)

### Settings de formato

| Setting | Default | Descripción |
| --- | --- | --- |
| `ifxFormat.uppercase` | `true` | Keywords en mayúsculas |
| `ifxFormat.indentSize` | `2` | Espacios por nivel |
| `ifxFormat.useTabs` | `false` | Tabs en vez de espacios |
| `ifxFormat.blankAfterQuery` | `true` | Blanco tras queries |
| `ifxFormat.blankAfterIf` | `true` | Blanco tras `IF`/`ELSE`/`END IF` |
| `ifxFormat.blankAfterReturning` | `true` | Blanco tras `RETURNING` |
| `ifxFormat.blankBeforeElseEndIf` | `true` | Blanco antes de `ELSE`/`END IF` |
| `ifxFormat.keepEndClosersTogether` | `true` | Cierres apilados juntos |

### Settings de syntax highlight

Colorea parámetros del `CREATE PROCEDURE` y variables `DEFINE` en todas sus apariciones (además del TextMate grammar).

| Setting | Default | Descripción |
| --- | --- | --- |
| `ifxFormat.syntax.highlightVariables` | `true` | Activa el highlight de parámetros/variables |
| `ifxFormat.syntax.parameterColor` | `#FBBF24` | Color de parámetros |
| `ifxFormat.syntax.localColor` | `#2DD4BF` | Color de variables locales |

## CLI

```bash
bun run format-file -- entrada.ifs salida.ifs
# in-place:
bun run format-file -- mi_proc.spl
```

## Publicar al Marketplace

Ver [PUBLISH.md](PUBLISH.md) (español) o [PUBLISH.en.md](PUBLISH.en.md) (English).

## Estructura

```text
src/extension.ts              # activation + formatter + highlighter
src/formatter.ts              # motor Informix SPL
src/highlight.ts              # decorations de parámetros/variables
src/highlight-parse.ts        # parse de nombres DEFINE / parámetros
scripts/build.ts              # bun build → dist/extension.cjs
scripts/format-cli.ts
scripts/install-extension.sh
syntaxes/                     # highlight TextMate
public/assets/icon/           # iconos de extensión y language
language-configuration.json
dist/extension.cjs            # salida (no editar a mano)
samples/test.spl              # ejemplo
```

## Licencia

MIT
