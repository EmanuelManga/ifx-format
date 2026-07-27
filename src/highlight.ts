import * as vscode from "vscode";
import {
  extractDefinedLocals,
  extractProcedureParams,
  findNameOffsets,
} from "./highlight-parse";

const LANGUAGE_ID = "informix-spl";

export type HighlightColors = {
  parameterColor: string;
  localColor: string;
  enabled: boolean;
};

export function readHighlightColors(): HighlightColors {
  const config = vscode.workspace.getConfiguration("ifxFormat");
  return {
    enabled: config.get("syntax.highlightVariables", true),
    parameterColor: config.get("syntax.parameterColor", "#FBBF24"),
    localColor: config.get("syntax.localColor", "#2DD4BF"),
  };
}

export class VariableHighlighter implements vscode.Disposable {
  private paramDecoration: vscode.TextEditorDecorationType | undefined;
  private localDecoration: vscode.TextEditorDecorationType | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;

  recreateDecorations(colors: HighlightColors): void {
    this.paramDecoration?.dispose();
    this.localDecoration?.dispose();

    this.paramDecoration = vscode.window.createTextEditorDecorationType({
      color: colors.parameterColor,
      fontStyle: "italic",
    });
    this.localDecoration = vscode.window.createTextEditorDecorationType({
      color: colors.localColor,
    });
  }

  dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.paramDecoration?.dispose();
    this.localDecoration?.dispose();
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
    if (!colors.enabled) {
      editor.setDecorations(this.paramDecoration, []);
      editor.setDecorations(this.localDecoration, []);
      return;
    }

    const text = editor.document.getText();
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
}
