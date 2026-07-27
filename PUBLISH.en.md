# Publish IFX Format to the Marketplace

[Español](PUBLISH.md) · [English](PUBLISH.en.md)

Practical guide to publish this extension to the **Visual Studio Marketplace** (VS Code) and, optionally, to **Open VSX** (useful for Cursor and other forks).

---

## Pre-flight checklist

1. **Publisher ID** in `package.json` → currently: `emanuelmanga`  
   Must match the publisher you create in Azure DevOps / Marketplace.
2. **`name` + `publisher`** = unique ID: `emanuelmanga.ifx-format`
3. Semver version in `package.json` (current: `0.2.9`)
4. `README.md` / `README.en.md`, `LICENSE`, icon
5. Build OK: `bun run build` produces `dist/extension.cjs`

### Icon

Already configured in `package.json`:

```json
"icon": "public/assets/icon/informix_icon_big@2x.png"
```

Language icons live at `public/assets/icon/informix_icon.png` (light/dark).

### Useful listing fields

In `package.json` (manifest root):

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

## 1. Create a publisher on Visual Studio Marketplace

1. Go to [https://marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)
2. Sign in with a Microsoft account
3. **Create publisher**
   - **ID**: `emanuelmanga` (must match `publisher` in `package.json`)
   - Display name, email, etc.
4. Accept the terms

If `emanuelmanga` is already taken, change `publisher` in `package.json` and rebuild/package.

---

## 2. Personal Access Token (PAT)

The `vsce` CLI authenticates with an Azure DevOps PAT.

1. Go to [https://dev.azure.com](https://dev.azure.com)  
   (create a free org if you don't have one)
2. User settings (top right) → **Personal access tokens** → **New Token**
3. Suggested settings:
   - **Name**: `vsce-publish`
   - **Organization**: All accessible organizations
   - **Expiration**: 90 days (or whatever you prefer)
   - **Scopes**: **Custom** → enable only **Marketplace** → **Manage**
4. Generate the token and **save it** (it won't be shown again)

---

## 3. Login and publish (VS Marketplace)

From the repo root:

```bash
bun install
bun run build

# Login (prompts for the PAT)
bunx @vscode/vsce login emanuelmanga

# Local package (optional, produces .vsix)
bun run package

# Publish
bun run publish:marketplace
```

If you don't have `repository` in `package.json` yet, the scripts already pass `--allow-missing-repository`. Once the repo is on GitHub, add:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/EmanuelManga/ifx-format"
}
```

and you can drop that flag.

Manual equivalent:

```bash
bunx @vscode/vsce publish --no-dependencies --allow-missing-repository
```

`--no-dependencies` is correct here: the extension has no runtime deps (only the external `vscode` API).

### First-time / verification

```bash
bunx @vscode/vsce package --no-dependencies --allow-missing-repository
# Inspect the .vsix (it's a zip): it should include package.json, dist/extension.cjs,
# syntaxes/, language-configuration.json, public/assets/icon/
```

After publishing, the extension appears at:

`https://marketplace.visualstudio.com/items?itemName=emanuelmanga.ifx-format`

Indexing may take a few minutes. In VS Code: Extensions → search **IFX Format**.

---

## 4. Open VSX (recommended if you use Cursor)

Cursor and several other editors also use [Open VSX](https://open-vsx.org/).

1. Create an account at [https://open-vsx.org/](https://open-vsx.org/)
2. Profile → **Access Tokens** → create a token
3. Publish:

```bash
export OVSX_PAT="your_open_vsx_token"
bun run publish:ovsx
```

Or:

```bash
bunx ovsx publish --pat "$OVSX_PAT" --no-dependencies
```

If you already have a `.vsix`:

```bash
bunx ovsx publish *.vsix --pat "$OVSX_PAT"
```

---

## 5. Install in Cursor / VS Code after publishing

- **VS Code**: Extensions marketplace → search **IFX Format** or ID `emanuelmanga.ifx-format`
- **Cursor**: Extensions → search; if missing, **Install from VSIX** or also publish to Open VSX
- Local alternative: `./scripts/install-extension.sh`

For Informix-only repos so `.sql` uses Informix:

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

## 6. Bump a published version

1. Bump the version in `package.json` (`0.2.9` → `0.2.10`)
2. Update changelog / README if needed
3. `bun run publish:marketplace` (and `publish:ovsx` if you use Open VSX)

Do not reuse the same version number: the Marketplace rejects it.

---

## 7. Common errors

| Error | What to do |
| --- | --- |
| `Publisher name not found` | `publisher` in `package.json` does not exist or isn't yours |
| `The Personal Access Token is invalid` | PAT missing Marketplace → Manage scope, or expired |
| `Invalid publisher` | ID differs from marketplace.visualstudio.com/manage |
| Extension missing in Cursor | Also publish to Open VSX or install the `.vsix` |
| `ENOENT dist/extension.cjs` | Run `bun run build` before package/publish |
| Packaging includes huge `node_modules` | Check `.vscodeignore`; use `--no-dependencies` |

---

## 8. Minimal flow (summary)

```bash
# 1. Create publisher + PAT (once)
# 2. bunx @vscode/vsce login emanuelmanga
# 3. Each release:
bun run build
# bump version in package.json
bun run publish:marketplace
bun run publish:ovsx   # optional but useful for Cursor
```

Done: **IFX Format** can be installed from the store without copying files into `~/.cursor/extensions`.
