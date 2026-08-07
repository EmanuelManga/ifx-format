# IFX Format

[Español](README.es.md) · [English](README.md)

Formats **Informix SPL** and **Informix 4GL** in Cursor and VS Code without overriding generic SQL formatters (Postgres, etc.).

**ID:** `emanuelmanga.ifx-format`

![Format Document](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/format.gif)

## Features

### Informix SPL (`.ifs` / `.ifx` / `.spl`)

- Formats `DEFINE`, `LET`, `IF` / `ELSE` / `END IF`, `FOR` / `FOREACH` / `WHILE`, queries and subqueries
- `ON EXCEPTION` / `END EXCEPTION` / `RAISE EXCEPTION` (indent, blanks, highlight)
- Blank line after queries, including `FOREACH` cursor `SELECT` (no trailing `;`)
- Uppercase keywords, adjustable indentation and blank lines
- TextMate syntax + semantic highlight: procedure params, `DEFINE` / `ON EXCEPTION SET` locals, control blocks matching their `END`
- Snippets: file header (`header` / `encabezado`), `CREATE PROCEDURE` skeleton (`procedure` / `proc`)

### Informix 4GL (`.4gl`) — separate stack

- Own language ID (`informix-4gl`), grammar, formatter and highlight (does not reuse the SPL formatter)
- Formats `DATABASE`, `MAIN` / `END MAIN`, `FUNCTION` / `END FUNCTION`, `IF`, `WHENEVER`, `DISPLAY`, `EXECUTE PROCEDURE`, etc.
- Semantic highlight: `DEFINE` locals, `FUNCTION` params, local function names (declaration + `CALL`), and builtins (`num_args`, `ARG_VAL`, …)
- Snippets: file header, `MAIN` skeleton, `FUNCTION` skeleton
- Settings under `ifxFormat.4gl.*` (independent from SPL)

### Shared

- Does not interfere with Postgres / other `.sql` formatters
- Custom icon for Informix file extensions (toggle with `ifxFormat.customFileIcons`)
- Format on save enabled by default for both languages

## Preview

### Format Document

![Format Document](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/format.gif)

### Another format example

![Format example](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/format_dos.gif)

### Parameter and variable highlighting

Procedure parameters and `DEFINE` variables with distinct colors:

![Variable highlight](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/highlight.png)

### `.spl` file icon

![File icon](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/file-icon.png)

## Supported files

| Extension              | Language ID    | Formatter             |
| ---------------------- | -------------- | --------------------- |
| `.ifs`, `.ifx`, `.spl` | `informix-spl` | IFX Format (SPL)      |
| `.4gl`                 | `informix-4gl` | IFX Format (4GL)      |
| `.sql`                 | `sql`          | Your usual formatters |

For Informix-only projects, associate `.sql` in the workspace:

```json
{
    "files.associations": {
        "*.sql": "informix-spl"
    }
}
```

## Usage

1. Open a `.ifs`, `.ifx`, `.spl`, or `.4gl` file
2. **Format Document** (`Shift+Alt+F`) or enable format on save
3. Or run **IFX Format: Format Document**

### Snippets

In an Informix file, type the prefix and accept the suggestion (`Enter` / `Tab`):

| Language | Prefix                         | Inserts                                      |
| -------- | ------------------------------ | -------------------------------------------- |
| SPL/4GL  | `header` / `encabezado`        | Module header (description, version, …)      |
| SPL      | `procedure` / `proc`           | `DROP` + `CREATE PROCEDURE` skeleton         |
| 4GL      | `main` / `main4gl`             | `DATABASE` + `MAIN` / `END MAIN`             |
| 4GL      | `function` / `func`            | `FUNCTION` / `END FUNCTION` skeleton         |

## Example (SPL)

**Before**

```sql
create procedure sp_demo(p_id int)
returning int;
define l_total int;
if p_id > 0 then
let l_total = p_id * 2;
else
let l_total = 0;
end if;
return l_total;
end procedure;
```

**After**

```sql
CREATE PROCEDURE sp_demo(p_id INT)
RETURNING INT;

  DEFINE l_total INT;

  IF p_id > 0 THEN
    LET l_total = p_id * 2;
  ELSE
    LET l_total = 0;
  END IF;

  RETURN l_total;

END PROCEDURE;
```

## Settings

### Shared

| Setting                       | Default | Description |
| ----------------------------- | ------- | ----------- |
| `ifxFormat.customFileIcons`   | `true`  | Show custom IFX icons for `.spl` / `.ifs` / `.ifx` / `.4gl`. When off and Material Icon Theme is installed, those extensions use the generic file icon. VS Code cannot remove language icons without an icon-theme override. |

### SPL formatting (`ifxFormat.*`)

| Setting                                 | Default | Description |
| --------------------------------------- | ------- | ----------- |
| `ifxFormat.uppercase`                   | `true`  | Uppercase keywords |
| `ifxFormat.indentSize`                  | `2`     | Spaces per indent level |
| `ifxFormat.useTabs`                     | `false` | Use tabs instead of spaces |
| `ifxFormat.blankAfterQuery`             | `true`  | Blank line after queries (also after `FOREACH` cursor `SELECT`) |
| `ifxFormat.blankAfterIf`                | `true`  | Blank after `IF` / `ELSE` / `END IF` / `END FOR` / `END FOREACH` / `END WHILE` |
| `ifxFormat.blankAfterReturning`         | `true`  | Blank line after `RETURNING` |
| `ifxFormat.blankBeforeElseEndIf`        | `true`  | Blank line before `ELSE` / `END IF` |
| `ifxFormat.blankBeforeException`        | `true`  | Blank line before `ON EXCEPTION` / `END EXCEPTION` |
| `ifxFormat.blankAfterException`         | `true`  | Blank line after `ON EXCEPTION` / `END EXCEPTION` |
| `ifxFormat.keepEndClosersTogether`      | `true`  | No blank lines between stacked closers |
| `ifxFormat.spaceBeforeCreateTableParen` | `true`  | Space before `(` in `CREATE [TEMP] TABLE name (` |
| `ifxFormat.blankAroundDropTable`        | `true`  | Group consecutive `DROP TABLE`; blank above/below |
| `ifxFormat.blankAfterCreateTable`       | `true`  | Blank line after `CREATE [TEMP] TABLE ...;` |

### 4GL formatting (`ifxFormat.4gl.*`)

| Setting                              | Default | Description |
| ------------------------------------ | ------- | ----------- |
| `ifxFormat.4gl.uppercase`            | `true`  | Uppercase 4GL keywords |
| `ifxFormat.4gl.indentSize`           | `2`     | Spaces per indent (`MAIN` / `FUNCTION` / `IF` / …) |
| `ifxFormat.4gl.useTabs`              | `false` | Use tabs instead of spaces |
| `ifxFormat.4gl.blankAfterIf`         | `true`  | Blank after `IF` / `ELSE` / `END IF` / loops |
| `ifxFormat.4gl.blankBeforeElseEndIf` | `true`  | Blank before `ELSE` / `END IF` |
| `ifxFormat.4gl.blankBeforeBlock`     | `true`  | Blank before `MAIN` / `FUNCTION` and their `END` |
| `ifxFormat.4gl.blankAfterBlock`      | `true`  | Blank after `MAIN` / `FUNCTION` and their `END` |
| `ifxFormat.4gl.keepEndClosersTogether` | `true` | No blank lines between stacked closers |

### Syntax highlighting (SPL + 4GL)

| Setting                                | Default   | Description |
| -------------------------------------- | --------- | ----------- |
| `ifxFormat.syntax.highlightVariables`  | `true`    | Color parameters, locals, 4GL functions/builtins |
| `ifxFormat.syntax.parameterColor`      | `#FBBF24` | Parameter color |
| `ifxFormat.syntax.localColor`          | `#2DD4BF` | Local / `DEFINE` / `ON EXCEPTION SET` color |
| `ifxFormat.syntax.functionColor`       | `#E5C07B` | Local 4GL function names (declaration + `CALL`) |
| `ifxFormat.syntax.builtinColor`        | `#56B6C2` | 4GL builtins (`num_args`, `ARG_VAL`, …) |
| `ifxFormat.syntax.highlightControl`    | `true`    | Control keywords match their `END` color |
| `ifxFormat.syntax.controlIfColor`      | `#C792EA` | `IF` / `ELSE` / `END IF` (also `MAIN` in 4GL) |
| `ifxFormat.syntax.controlForColor`     | `#82AAFF` | `FOR` / `END FOR` (also `FUNCTION` keyword in 4GL) |
| `ifxFormat.syntax.controlForeachColor` | `#82AAFF` | `FOREACH` / `END FOREACH` |
| `ifxFormat.syntax.controlWhileColor`   | `#82AAFF` | `WHILE` / `END WHILE` |
| `ifxFormat.syntax.controlExceptionColor` | `#FF5370` | `ON EXCEPTION` / `END EXCEPTION` |

## Requirements

Cursor or VS Code `>= 1.74`

## Links

- [Repository](https://github.com/EmanuelManga/ifx-format)
- [Issues](https://github.com/EmanuelManga/ifx-format/issues)

## License

MIT
