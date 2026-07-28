import * as vscode from "vscode";
import {
  extractDefinedLocals,
  extractProcedureParams,
  findControlKeywordOffsets,
  findNameOffsets,
  type ControlFamily,
} from "./highlight-parse";

const LANGUAGE_ID = "informix-spl";

export type HighlightColors = {
  parameterColor: string;
  localColor: string;
  enabled: boolean;
  highlightControl: boolean;
  controlIfColor: string;
  controlForColor: string;
  controlForeachColor: string;
  controlWhileColor: string;
};

export function readHighlightColors(): HighlightColors {
  const config = vscode.workspace.getConfiguration("ifxFormat");
  return {
    enabled: config.get("syntax.highlightVariables", true),
    parameterColor: config.get("syntax.parameterColor", "#FBBF24"),
    localColor: config.get("syntax.localColor", "#2DD4BF"),
    highlightControl: config.get("syntax.highlightControl", true),
    controlIfColor: config.get("syntax.controlIfColor", "#C792EA"),
    controlForColor: config.get("syntax.controlForColor", "#82AAFF"),
    controlForeachColor: config.get("syntax.controlForeachColor", "#82AAFF"),
    controlWhileColor: config.get("syntax.controlWhileColor", "#82AAFF"),
  };
}

export class VariableHighlighter implements vscode.Disposable {
  private paramDecoration: vscode.TextEditorDecorationType | undefined;
  private localDecoration: vscode.TextEditorDecorationType | undefined;
  private controlDecorations = new Map<
    ControlFamily,
    vscode.TextEditorDecorationType
  >();
  private timer: ReturnType<typeof setTimeout> | undefined;

  recreateDecorations(colors: HighlightColors): void {
    this.paramDecoration?.dispose();
    this.localDecoration?.dispose();
    for (const d of this.controlDecorations.values()) d.dispose();
    this.controlDecorations.clear();

    this.paramDecoration = vscode.window.createTextEditorDecorationType({
      color: colors.parameterColor,
      fontStyle: "italic",
    });
    this.localDecoration = vscode.window.createTextEditorDecorationType({
      color: colors.localColor,
    });

    const controlColors: Record<ControlFamily, string> = {
      if: colors.controlIfColor,
      for: colors.controlForColor,
      foreach: colors.controlForeachColor,
      while: colors.controlWhileColor,
    };
    for (const [family, color] of Object.entries(controlColors) as [
      ControlFamily,
      string,
    ][]) {
      this.controlDecorations.set(
        family,
        vscode.window.createTextEditorDecorationType({
          color,
          fontWeight: "bold",
        }),
      );
    }
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.paramDecoration?.dispose();
    this.localDecoration?.dispose();
    for (const d of this.controlDecorations.values()) d.dispose();
    this.controlDecorations.clear();
  }

  schedule(editor: vscode.TextEditor | undefined): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.refresh(editor), 120);
  }

  refresh(editor: vscode.TextEditor | undefined): void {
    if (!editor || editor.document.languageId !== LANGUAGE_ID) {
      return;
    }
    if (!this.paramDecoration || !this.localDecoration) return;

    const colors = readHighlightColors();
    const text = editor.document.getText();

    if (!colors.enabled) {
      editor.setDecorations(this.paramDecoration, []);
      editor.setDecorations(this.localDecoration, []);
    } else {
      const params = extractProcedureParams(text);
      const locals = extractDefinedLocals(text);

      for (const p of params) locals.delete(p);

      const toRanges = (names: Set<string>) =>
        findNameOffsets(text, names).map(
          (span) =>
            new vscode.Range(
              editor.document.positionAt(span.start),
              editor.document.positionAt(span.end),
            ),
        );

      editor.setDecorations(this.paramDecoration, toRanges(params));
      editor.setDecorations(this.localDecoration, toRanges(locals));
    }

    if (!colors.highlightControl) {
      for (const d of this.controlDecorations.values()) {
        editor.setDecorations(d, []);
      }
      return;
    }

    const grouped: Record<ControlFamily, vscode.Range[]> = {
      if: [],
      for: [],
      foreach: [],
      while: [],
    };

    for (const hit of findControlKeywordOffsets(text)) {
      grouped[hit.family].push(
        new vscode.Range(
          editor.document.positionAt(hit.start),
          editor.document.positionAt(hit.end),
        ),
      );
    }

    for (const [family, ranges] of Object.entries(grouped) as [
      ControlFamily,
      vscode.Range[],
    ][]) {
      const decoration = this.controlDecorations.get(family);
      if (decoration) editor.setDecorations(decoration, ranges);
    }
  }
}
