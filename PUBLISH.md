# Publicar IFX Format en el Marketplace

[Español](PUBLISH.md) · [English](PUBLISH.en.md)

Guía práctica para subir esta extensión a **Visual Studio Marketplace** (VS Code) y, opcionalmente, a **Open VSX** (útil para Cursor y otros forks).

---

## Checklist previo

1. **Publisher ID** en `package.json` → hoy: `emanuelmanga`  
   Tiene que coincidir con el publisher que creés en Azure DevOps / Marketplace.
2. **`name` + `publisher`** = ID único: `emanuelmanga.ifx-format`
3. Versión semver en `package.json` (actual: `0.2.9`)
4. `README.md` / `README.en.md`, `LICENSE`, icono
5. Build OK: `bun run build` genera `dist/extension.cjs`

### Icono

Ya está configurado en `package.json`:

```json
"icon": "public/assets/icon/informix_icon_big@2x.png"
```

También hay iconos de language en `public/assets/icon/informix_icon.png` (light/dark).

### Campos útiles para el listing

En `package.json` (raíz del manifesto):

```json
"repository": {
  "type": "git",
  "url": "https://github.com/EmanuelManga/ifx-format"
},
"bugs": {
  "url": "https://github.com/EmanuelManga/ifx-format/issues"
},
"homepage": "https://github.com/EmanuelManga/ifx-format#readme"
```

---

## 1. Crear publisher en Visual Studio Marketplace

1. Entrá a [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Iniciá sesión con cuenta Microsoft
3. **Create publisher**
   - **ID**: `emanuelmanga` (debe coincidir con `publisher` del `package.json`)
   - Nombre visible, email, etc.
4. Aceptá los términos

Si el ID `emanuelmanga` ya está tomado, cambiá `publisher` en `package.json` y volvé a build/package.

---

## 2. Personal Access Token (PAT)

El CLI `vsce` autentica con un PAT de Azure DevOps.

1. Andá a [https://dev.azure.com](https://dev.azure.com)  
   (si no tenés org, creá una gratis)
2. User settings (arriba derecha) → **Personal access tokens** → **New Token**
3. Configuración sugerida:
   - **Name**: `vsce-publish`
   - **Organization**: All accessible organizations
   - **Expiration**: 90 días (o lo que prefieras)
   - **Scopes**: **Custom** → marcar solo **Marketplace** → **Manage**
4. Generá el token y **guardalo** (no se vuelve a mostrar)

---

## 3. Login y publicar (VS Marketplace)

Desde la raíz de este repo:

```bash
bun install
bun run build

# Login (te pide el PAT)
bunx @vscode/vsce login emanuelmanga

# Empaquetar local (opcional, genera .vsix)
bun run package

# Publicar
bun run publish:marketplace
```

Si aún no tenés `repository` en `package.json`, los scripts ya pasan `--allow-missing-repository`. Cuando subas el repo a GitHub, agregá:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/EmanuelManga/ifx-format"
}
```

y podés sacar ese flag.

Equivalente manual:

```bash
bunx @vscode/vsce publish --no-dependencies --allow-missing-repository
```

`--no-dependencies` es correcto acá: la extensión no tiene runtime deps (solo `vscode` externo).

### Primera vez / verificación

```bash
bunx @vscode/vsce package --no-dependencies --allow-missing-repository
# Inspectá el .vsix (es un zip): debe incluir package.json, dist/extension.cjs,
# syntaxes/, language-configuration.json, public/assets/icon/
```

Tras publicar, la extensión aparece en:

`https://marketplace.visualstudio.com/items?itemName=emanuelmanga.ifx-format`

Puede tardar unos minutos en indexarse. En VS Code: Extensions → buscar **IFX Format**.

---

## 4. Open VSX (recomendado si usás Cursor)

Cursor y varios editores también miran [Open VSX](https://open-vsx.org/).

1. Creá cuenta en [https://open-vsx.org/](https://open-vsx.org/)
2. Perfil → **Access Tokens** → crear token
3. Publicá:

```bash
export OVSX_PAT="tu_token_open_vsx"
bun run publish:ovsx
```

O:

```bash
bunx ovsx publish --pat "$OVSX_PAT" --no-dependencies
```

Si ya tenés un `.vsix`:

```bash
bunx ovsx publish *.vsix --pat "$OVSX_PAT"
```

---

## 5. Instalar en Cursor / VS Code después de publicar

- **VS Code**: Extensions marketplace → buscar **IFX Format** o ID `emanuelmanga.ifx-format`
- **Cursor**: Extensions → buscar; si no aparece, **Install from VSIX** o publicá también en Open VSX
- Alternativa local: `./scripts/install-extension.sh`

Para que `.sql` use Informix solo en repos Informix:

```json
{
  "files.associations": {
    "*.sql": "informix-spl"
  },
  "[informix-spl]": {
    "editor.defaultFormatter": "emanuelmanga.ifx-format",
    "editor.formatOnSave": true
  }
}
```

---

## 6. Actualizar una versión ya publicada

1. Subí la versión en `package.json` (`0.2.9` → `0.2.10`)
2. Actualizá el changelog / README si aplica
3. `bun run publish:marketplace` (y `publish:ovsx` si usás Open VSX)

No reutilices el mismo número de versión: el Marketplace lo rechaza.

---

## 7. Errores frecuentes

| Error | Qué hacer |
| --- | --- |
| `Publisher name not found` | El `publisher` del `package.json` no existe o no es tuyo |
| `The Personal Access Token is invalid` | PAT sin scope Marketplace → Manage, o expirado |
| `Invalid publisher` | ID distinto al de marketplace.visualstudio.com/manage |
| Extension no aparece en Cursor | Publicá también en Open VSX o instalá el `.vsix` |
| `ENOENT dist/extension.cjs` | Corré `bun run build` antes de package/publish |
| Packaging incluye `node_modules` enormes | Revisá `.vscodeignore`; usá `--no-dependencies` |

---

## 8. Flujo mínimo (resumen)

```bash
# 1. Crear publisher + PAT (una sola vez)
# 2. bunx @vscode/vsce login emanuelmanga
# 3. Cada release:
bun run build
# bump version en package.json
bun run publish:marketplace
bun run publish:ovsx   # opcional pero útil para Cursor
```

Listo: **IFX Format** queda instalable desde la store sin copiar archivos a `~/.cursor/extensions`.
