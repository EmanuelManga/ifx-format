# IFX Format

[Español](README.es.md) · [English](README.md)

Formatea **Informix SPL** e **Informix 4GL** en Cursor y VS Code, sin pisar formatters de SQL genérico (Postgres, etc.).

**ID:** `emanuelmanga.ifx-format`

![Format Document](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/format.gif)

## Características

### Informix SPL (`.ifs` / `.ifx` / `.spl`)

- Formato de `DEFINE`, `LET`, `IF` / `ELSE` / `END IF`, `FOR` / `FOREACH` / `WHILE`, queries y subqueries
- `ON EXCEPTION` / `END EXCEPTION` / `RAISE EXCEPTION` (indent, blancos, highlight)
- Línea en blanco tras queries, también después del `SELECT` de un `FOREACH` (sin `;` final)
- Keywords a mayúsculas, indentación y blancos configurables
- TextMate + highlight semántico: parámetros del procedure, locales `DEFINE` / `ON EXCEPTION SET`, bloques de control con el mismo color que su `END`
- Snippets: encabezado (`header` / `encabezado`), esqueleto `CREATE PROCEDURE` (`procedure` / `proc`)

### Informix 4GL (`.4gl`) — stack separado

- Language ID propio (`informix-4gl`), gramática, formatter y highlight (no reutiliza el formatter SPL)
- Formato de `DATABASE`, `MAIN` / `END MAIN`, `FUNCTION` / `END FUNCTION`, `IF`, `WHENEVER`, `DISPLAY`, `EXECUTE PROCEDURE`, etc.
- Highlight semántico: locales `DEFINE`, params de `FUNCTION`, nombres de funciones locales (declaración + `CALL`) y builtins (`num_args`, `ARG_VAL`, …)
- Snippets: encabezado, esqueleto `MAIN`, esqueleto `FUNCTION`
- Settings bajo `ifxFormat.4gl.*` (independientes del SPL)

### Compartido

- No interfiere con Postgres u otros formatters `.sql`
- Icono propio para las extensiones Informix (se puede apagar con `ifxFormat.customFileIcons`)
- Format on save activo por defecto en ambos lenguajes

## Preview

### Format Document

![Format Document](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/format.gif)

### Otro ejemplo de formato

![Format example](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/format_dos.gif)

### Highlight de parámetros y variables

Parámetros del procedure y variables `DEFINE` con colores distintos:

![Variable highlight](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/highlight.png)

### Icono de archivo `.spl`

![File icon](https://raw.githubusercontent.com/EmanuelManga/ifx-format/main/public/assets/demo/file-icon.png)

## Archivos soportados

| Extensión              | Language ID    | Formatter                 |
| ---------------------- | -------------- | ------------------------- |
| `.ifs`, `.ifx`, `.spl` | `informix-spl` | IFX Format (SPL)          |
| `.4gl`                 | `informix-4gl` | IFX Format (4GL)          |
| `.sql`                 | `sql`          | Tus formatters habituales |

Para proyectos solo Informix, asociá `.sql` en el workspace:

```json
{
    "files.associations": {
        "*.sql": "informix-spl"
    }
}
```

## Uso

1. Abrí un `.ifs`, `.ifx`, `.spl` o `.4gl`
2. **Format Document** (`Shift+Alt+F`) o activá format on save
3. O el comando **IFX Format: Format Document**

### Snippets

En un archivo Informix, escribí el prefijo y aceptá la sugerencia (`Enter` / `Tab`):

| Lenguaje | Prefijo                        | Inserta                                      |
| -------- | ------------------------------ | -------------------------------------------- |
| SPL/4GL  | `header` / `encabezado`        | Encabezado de módulo (descripción, versión…) |
| SPL      | `procedure` / `proc`           | Esqueleto `DROP` + `CREATE PROCEDURE`        |
| 4GL      | `main` / `main4gl`             | `DATABASE` + `MAIN` / `END MAIN`             |
| 4GL      | `function` / `func`            | Esqueleto `FUNCTION` / `END FUNCTION`        |

## Ejemplo (SPL)

**Antes**

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

**Después**

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

### Compartido

| Setting                       | Default | Descripción |
| ----------------------------- | ------- | ----------- |
| `ifxFormat.customFileIcons`   | `true`  | Muestra los iconos custom de IFX en `.spl` / `.ifs` / `.ifx` / `.4gl`. Si se desactiva y tenés Material Icon Theme, esas extensiones usan el icono genérico. VS Code no permite quitar language icons sin un override del icon theme. |

### Formato SPL (`ifxFormat.*`)

| Setting                                 | Default | Descripción |
| --------------------------------------- | ------- | ----------- |
| `ifxFormat.uppercase`                   | `true`  | Keywords en mayúsculas |
| `ifxFormat.indentSize`                  | `2`     | Espacios por nivel |
| `ifxFormat.useTabs`                     | `false` | Tabs en vez de espacios |
| `ifxFormat.blankAfterQuery`             | `true`  | Blanco tras queries (también tras el `SELECT` de un `FOREACH`) |
| `ifxFormat.blankAfterIf`                | `true`  | Blanco tras `IF` / `ELSE` / `END IF` / `END FOR` / `END FOREACH` / `END WHILE` |
| `ifxFormat.blankAfterReturning`         | `true`  | Blanco tras `RETURNING` |
| `ifxFormat.blankBeforeElseEndIf`        | `true`  | Blanco antes de `ELSE` / `END IF` |
| `ifxFormat.blankBeforeException`        | `true`  | Blanco antes de `ON EXCEPTION` / `END EXCEPTION` |
| `ifxFormat.blankAfterException`         | `true`  | Blanco después de `ON EXCEPTION` / `END EXCEPTION` |
| `ifxFormat.keepEndClosersTogether`      | `true`  | Cierres consecutivos sin blancos entre sí |
| `ifxFormat.spaceBeforeCreateTableParen` | `true`  | Espacio antes de `(` en `CREATE [TEMP] TABLE nombre (` |
| `ifxFormat.blankAroundDropTable`        | `true`  | Agrupa `DROP TABLE` consecutivos; blanco arriba/abajo |
| `ifxFormat.blankAfterCreateTable`       | `true`  | Blanco tras `CREATE [TEMP] TABLE ...;` |

### Formato 4GL (`ifxFormat.4gl.*`)

| Setting                                | Default | Descripción |
| -------------------------------------- | ------- | ----------- |
| `ifxFormat.4gl.uppercase`              | `true`  | Keywords 4GL en mayúsculas |
| `ifxFormat.4gl.indentSize`             | `2`     | Espacios por nivel (`MAIN` / `FUNCTION` / `IF` / …) |
| `ifxFormat.4gl.useTabs`                | `false` | Tabs en vez de espacios |
| `ifxFormat.4gl.blankAfterIf`           | `true`  | Blanco tras `IF` / `ELSE` / `END IF` / loops |
| `ifxFormat.4gl.blankBeforeElseEndIf`   | `true`  | Blanco antes de `ELSE` / `END IF` |
| `ifxFormat.4gl.blankBeforeBlock`       | `true`  | Blanco antes de `MAIN` / `FUNCTION` y sus `END` |
| `ifxFormat.4gl.blankAfterBlock`        | `true`  | Blanco después de `MAIN` / `FUNCTION` y sus `END` |
| `ifxFormat.4gl.keepEndClosersTogether` | `true`  | Cierres consecutivos sin blancos entre sí |

### Highlight de sintaxis (SPL + 4GL)

| Setting                                  | Default   | Descripción |
| ---------------------------------------- | --------- | ----------- |
| `ifxFormat.syntax.highlightVariables`    | `true`    | Colorea parámetros, locales, funciones/builtins 4GL |
| `ifxFormat.syntax.parameterColor`        | `#FBBF24` | Color de parámetros |
| `ifxFormat.syntax.localColor`            | `#2DD4BF` | Color de locales / `DEFINE` / `ON EXCEPTION SET` |
| `ifxFormat.syntax.functionColor`         | `#E5C07B` | Nombres de funciones locales 4GL (declaración + `CALL`) |
| `ifxFormat.syntax.builtinColor`          | `#56B6C2` | Builtins 4GL (`num_args`, `ARG_VAL`, …) |
| `ifxFormat.syntax.highlightControl`      | `true`    | Keywords de control con el mismo color que su `END` |
| `ifxFormat.syntax.controlIfColor`        | `#C792EA` | `IF` / `ELSE` / `END IF` (también `MAIN` en 4GL) |
| `ifxFormat.syntax.controlForColor`       | `#82AAFF` | `FOR` / `END FOR` (también keyword `FUNCTION` en 4GL) |
| `ifxFormat.syntax.controlForeachColor`   | `#82AAFF` | `FOREACH` / `END FOREACH` |
| `ifxFormat.syntax.controlWhileColor`     | `#82AAFF` | `WHILE` / `END WHILE` |
| `ifxFormat.syntax.controlExceptionColor` | `#FF5370` | `ON EXCEPTION` / `END EXCEPTION` |

## Requisitos

Cursor o VS Code `>= 1.74`

## Links

- [Repositorio](https://github.com/EmanuelManga/ifx-format)
- [Issues](https://github.com/EmanuelManga/ifx-format/issues)

## Licencia

MIT
