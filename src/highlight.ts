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
  controlExceptionColor: string;
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
    controlExceptionColor: config.get(
      "syntax.controlExceptionColor",
      "#FF5370",
    ),
  };
}

type CachedRanges = {
  version: number;
  params: vscode.Range[];
  locals: vscode.Range[];
  control: Record<ControlFamily, vscode.Range[]>;
};

const EMPTY_CONTROL: Record<ControlFamily, vscode.Range[]> = {
  if: [],
  for: [],
  foreach: [],
  while: [],
  exception: [],
};

export class VariableHighlighter implements vscode.Disposable {
  private paramDecoration: vscode.TextEditorDecorationType | undefined;
  private localDecoration: vscode.TextEditorDecorationType | undefined;
  private controlDecorations = new Map<
    ControlFamily,
    vscode.TextEditorDecorationType
  >();
  private colors: HighlightColors = readHighlightColors();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pendingUri: string | undefined;
  /** uri → last computed ranges for that document version */
  private cache = new Map<string, CachedRanges>();

  recreateDecorations(colors: HighlightColors): void {
    this.colors = colors;
    this.cache.clear();
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
      exception: colors.controlExceptionColor,
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
    this.cache.clear();
    this.paramDecoration?.dispose();
    this.localDecoration?.dispose();
    for (const d of this.controlDecorations.values()) d.dispose();
    this.controlDecorations.clear();
  }

  /** Debounced — only for typing. */
  schedule(editor: vscode.TextEditor | undefined): void {
    if (!editor || editor.document.languageId !== LANGUAGE_ID) return;
    this.pendingUri = editor.document.uri.toString();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const uri = this.pendingUri;
      const target = vscode.window.visibleTextEditors.find(
        (ed) => ed.document.uri.toString() === uri,
      );
      if (target) this.refresh(target, true);
    }, 80);
  }

  /** Immediate — tab switch / open / config. */
  paintVisible(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.refresh(editor, false);
    }
  }

  refresh(editor: vscode.TextEditor | undefined, bustCache: boolean): void {
    if (!editor || editor.document.languageId !== LANGUAGE_ID) return;
    if (!this.paramDecoration || !this.localDecoration) return;

    const doc = editor.document;
    const uri = doc.uri.toString();
    const cached = bustCache ? undefined : this.cache.get(uri);
    const ranges =
      cached && cached.version === doc.version
        ? cached
        : this.compute(doc);

    this.cache.set(uri, ranges);
    this.apply(editor, ranges);
  }

  private compute(doc: vscode.TextDocument): CachedRanges {
    const text = doc.getText();
    const colors = this.colors;

    const toRanges = (spans: { start: number; end: number }[]) =>
      spans.map(
        (span) =>
          new vscode.Range(
            doc.positionAt(span.start),
            doc.positionAt(span.end),
          ),
      );

    let params: vscode.Range[] = [];
    let locals: vscode.Range[] = [];

    if (colors.enabled) {
      const paramNames = extractProcedureParams(text);
      const localNames = extractDefinedLocals(text);
      for (const p of paramNames) localNames.delete(p);
      params = toRanges(findNameOffsets(text, paramNames));
      locals = toRanges(findNameOffsets(text, localNames));
    }

    const control: Record<ControlFamily, vscode.Range[]> = {
      if: [],
      for: [],
      foreach: [],
      while: [],
      exception: [],
    };

    if (colors.highlightControl) {
      for (const hit of findControlKeywordOffsets(text)) {
        control[hit.family].push(
          new vscode.Range(doc.positionAt(hit.start), doc.positionAt(hit.end)),
        );
      }
    }

    return { version: doc.version, params, locals, control };
  }

  private apply(editor: vscode.TextEditor, ranges: CachedRanges): void {
    editor.setDecorations(this.paramDecoration!, ranges.params);
    editor.setDecorations(this.localDecoration!, ranges.locals);

    for (const [family, decoration] of this.controlDecorations) {
      editor.setDecorations(
        decoration,
        this.colors.highlightControl
          ? ranges.control[family]
          : EMPTY_CONTROL[family],
      );
    }
  }
}
