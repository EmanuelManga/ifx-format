# IFX Format

[Español](README.md) · [English](README.en.md)

Formats **Informix SPL** procedures in Cursor and VS Code without overriding generic SQL formatters (Postgres, etc.).

**ID:** `emanuelmanga.ifx-format`

![Format Document](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/format.gif)

## Features

- Formats `DEFINE`, `LET`, `IF` / `ELSE` / `END IF`, `FOR` / `FOREACH`, queries, and subqueries
- Uppercase keywords (configurable)
- Adjustable indentation and blank lines
- TextMate syntax highlighting for Informix SPL
- Highlights `CREATE PROCEDURE` parameters and `DEFINE` variables across the file
- Own language ID (`informix-spl`): does not interfere with Postgres or other `.sql` formatters
- Custom icon for `.ifs` / `.ifx` / `.spl` files

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

| Extension | Language ID | Formatter |
| --- | --- | --- |
| `.ifs`, `.ifx`, `.spl` | `informix-spl` | IFX Format |
| `.sql` | `sql` | Your usual formatters |

For Informix-only projects, associate `.sql` in the workspace:

```json
{
  "files.associations": {
    "*.sql": "informix-spl"
  }
}
```

## Usage

1. Open a `.ifs`, `.ifx`, or `.spl` file
2. **Format Document** (`Shift+Alt+F`) or enable format on save
3. Or run **IFX Format: Format Document**

On install, `informix-spl` already uses IFX Format as the default formatter with format on save enabled.

## Example

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

### Formatting

| Setting | Default | Description |
| --- | --- | --- |
| `ifxFormat.uppercase` | `true` | Uppercase keywords |
| `ifxFormat.indentSize` | `2` | Spaces per indent level |
| `ifxFormat.useTabs` | `false` | Use tabs instead of spaces |
| `ifxFormat.blankAfterQuery` | `true` | Blank line after queries |
| `ifxFormat.blankAfterIf` | `true` | Blank line after `IF` / `ELSE` / `END IF` |
| `ifxFormat.blankAfterReturning` | `true` | Blank line after `RETURNING` |
| `ifxFormat.blankBeforeElseEndIf` | `true` | Blank line before `ELSE` / `END IF` |
| `ifxFormat.keepEndClosersTogether` | `true` | No blank lines between stacked closers |

### Variable highlighting

| Setting | Default | Description |
| --- | --- | --- |
| `ifxFormat.syntax.highlightVariables` | `true` | Color parameters and variables |
| `ifxFormat.syntax.parameterColor` | `#FBBF24` | Parameter color |
| `ifxFormat.syntax.localColor` | `#2DD4BF` | Local variable color |
| `ifxFormat.syntax.highlightControl` | `true` | IF/ELSE/FOR/FOREACH/WHILE match their END color |
| `ifxFormat.syntax.controlIfColor` | `#C792EA` | IF / ELSE / END IF color |
| `ifxFormat.syntax.controlForColor` | `#82AAFF` | FOR / END FOR color |
| `ifxFormat.syntax.controlForeachColor` | `#82AAFF` | FOREACH / END FOREACH color |
| `ifxFormat.syntax.controlWhileColor` | `#82AAFF` | WHILE / END WHILE color |

## Requirements

Cursor or VS Code `>= 1.74`

## Links

- [Repository](https://github.com/EmanuelManga/ifx-format)
- [Issues](https://github.com/EmanuelManga/ifx-format/issues)

## License

MIT
