import * as vscode from "vscode";

const SETTING = "ifxFormat.customFileIcons";
const MATERIAL_ASSOC = "material-icon-theme.files.associations";
const STATE_MATERIAL = "ifxFormat.savedMaterialAssoc";
const STATE_WARNED = "ifxFormat.hideIconsWarned";

const OUR_GLOBS = ["*.spl", "*.ifs", "*.ifx", "*.4gl"] as const;

/** Apply or revert custom Informix file icons preference. */
export async function applyCustomFileIcons(
  context: vscode.ExtensionContext,
): Promise<void> {
  const enabled = vscode.workspace
    .getConfiguration("ifxFormat")
    .get<boolean>("customFileIcons", true);

  if (enabled) {
    await restoreMaterialOverrides(context);
  } else {
    await hideIcons(context);
  }
}

async function hideIcons(context: vscode.ExtensionContext): Promise<void> {
  const material = vscode.extensions.getExtension(
    "PKief.material-icon-theme",
  );

  if (material) {
    await hideViaMaterial(context);
    return;
  }

  // ponytail: VS Code can't remove language contribution icons at runtime.
  // Without Material (or similar) overriding the extension, icons stay visible.
  if (!context.globalState.get<boolean>(STATE_WARNED)) {
    await context.globalState.update(STATE_WARNED, true);
    void vscode.window.showInformationMessage(
      "IFX Format: para ocultar los iconos custom hace falta Material Icon Theme (asocia .spl/.4gl al icono genérico). VS Code no permite quitar language icons en runtime.",
    );
  }
}

async function hideViaMaterial(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  const current =
    config.get<Record<string, string>>(MATERIAL_ASSOC) ?? {};
  const saved: Record<string, string | null> = {};

  const next = { ...current };
  for (const glob of OUR_GLOBS) {
    saved[glob] = Object.prototype.hasOwnProperty.call(current, glob)
      ? current[glob]!
      : null;
    next[glob] = "file";
  }

  await context.globalState.update(STATE_MATERIAL, saved);
  await config.update(
    MATERIAL_ASSOC,
    next,
    vscode.ConfigurationTarget.Global,
  );
}

async function restoreMaterialOverrides(
  context: vscode.ExtensionContext,
): Promise<void> {
  const savedMaterial = context.globalState.get<Record<string, string | null>>(
    STATE_MATERIAL,
  );
  if (!savedMaterial) return;

  const config = vscode.workspace.getConfiguration();
  const current =
    config.get<Record<string, string>>(MATERIAL_ASSOC) ?? {};
  const next = { ...current };
  for (const glob of OUR_GLOBS) {
    const prev = savedMaterial[glob];
    if (prev === null || prev === undefined) {
      delete next[glob];
    } else {
      next[glob] = prev;
    }
  }
  await config.update(
    MATERIAL_ASSOC,
    Object.keys(next).length ? next : undefined,
    vscode.ConfigurationTarget.Global,
  );
  await context.globalState.update(STATE_MATERIAL, undefined);
}

export function customFileIconsSettingId(): string {
  return SETTING;
}
