import * as vscode from "vscode";
import * as spl from "./highlight-parse";
import * as fgl from "./highlight-parse-4gl";

const LANG_SPL = "informix-spl";
const LANG_4GL = "informix-4gl";

export type HighlightColors = {
  parameterColor: string;
  localColor: string;
  functionColor: string;
  builtinColor: string;
  enabled: boolean;
  highlightControl: boolean;
  controlIfColor: string;
  controlForColor: string;
  controlForeachColor: string;
  controlWhileColor: string;
  controlExceptionColor: string;
};

/** All control families across SPL + 4GL. */
type DecorFamily =
  | spl.ControlFamily
  | fgl.ControlFamily4gl;

export function readHighlightColors(): HighlightColors {
  const config = vscode.workspace.getConfiguration("ifxFormat");
  return {
    enabled: config.get("syntax.highlightVariables", true),
    parameterColor: config.get("syntax.parameterColor", "#FBBF24"),
    localColor: config.get("syntax.localColor", "#2DD4BF"),
    functionColor: config.get("syntax.functionColor", "#E5C07B"),
    builtinColor: config.get("syntax.builtinColor", "#56B6C2"),
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
  functions: vscode.Range[];
  builtins: vscode.Range[];
  control: Partial<Record<DecorFamily, vscode.Range[]>>;
};

function isSupportedLang(id: string): boolean {
  return id === LANG_SPL || id === LANG_4GL;
}

export class VariableHighlighter implements vscode.Disposable {
  private paramDecoration: vscode.TextEditorDecorationType | undefined;
  private localDecoration: vscode.TextEditorDecorationType | undefined;
  private functionDecoration: vscode.TextEditorDecorationType | undefined;
  private builtinDecoration: vscode.TextEditorDecorationType | undefined;
  private controlDecorations = new Map<
    DecorFamily,
    vscode.TextEditorDecorationType
  >();
  private colors: HighlightColors = readHighlightColors();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pendingUri: string | undefined;
  private cache = new Map<string, CachedRanges>();

  recreateDecorations(colors: HighlightColors): void {
    this.colors = colors;
    this.cache.clear();
    this.paramDecoration?.dispose();
    this.localDecoration?.dispose();
    this.functionDecoration?.dispose();
    this.builtinDecoration?.dispose();
    for (const d of this.controlDecorations.values()) d.dispose();
    this.controlDecorations.clear();

    this.paramDecoration = vscode.window.createTextEditorDecorationType({
      color: colors.parameterColor,
      fontStyle: "italic",
    });
    this.localDecoration = vscode.window.createTextEditorDecorationType({
      color: colors.localColor,
    });
    this.functionDecoration = vscode.window.createTextEditorDecorationType({
      color: colors.functionColor,
    });
    this.builtinDecoration = vscode.window.createTextEditorDecorationType({
      color: colors.builtinColor,
      fontStyle: "italic",
    });

    const controlColors: Record<DecorFamily, string> = {
      if: colors.controlIfColor,
      for: colors.controlForColor,
      foreach: colors.controlForeachColor,
      while: colors.controlWhileColor,
      exception: colors.controlExceptionColor,
      // ponytail: reuse existing palette; no extra 4GL color settings
      main: colors.controlIfColor,
      function: colors.controlForColor,
    };
    for (const [family, color] of Object.entries(controlColors) as [
      DecorFamily,
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
    this.functionDecoration?.dispose();
    this.builtinDecoration?.dispose();
    for (const d of this.controlDecorations.values()) d.dispose();
    this.controlDecorations.clear();
  }

  schedule(editor: vscode.TextEditor | undefined): void {
    if (!editor || !isSupportedLang(editor.document.languageId)) return;
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

  paintVisible(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.refresh(editor, false);
    }
  }

  refresh(editor: vscode.TextEditor | undefined, bustCache: boolean): void {
    if (!editor || !isSupportedLang(editor.document.languageId)) return;
    if (
      !this.paramDecoration ||
      !this.localDecoration ||
      !this.functionDecoration ||
      !this.builtinDecoration
    ) {
      return;
    }

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
    const is4gl = doc.languageId === LANG_4GL;

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
    let functions: vscode.Range[] = [];
    let builtins: vscode.Range[] = [];

    if (colors.enabled) {
      const paramNames = is4gl
        ? fgl.extractFunctionParams(text)
        : spl.extractProcedureParams(text);
      const localNames = is4gl
        ? fgl.extractDefinedLocals(text)
        : spl.extractDefinedLocals(text);
      for (const p of paramNames) localNames.delete(p);
      const findNames = is4gl ? fgl.findNameOffsets : spl.findNameOffsets;
      params = toRanges(findNames(text, paramNames));
      locals = toRanges(findNames(text, localNames));

      if (is4gl) {
        const localFns = fgl.extractLocalFunctions(text);
        functions = toRanges(fgl.findNameOffsets(text, localFns));
        builtins = toRanges(fgl.findBuiltinCallOffsets(text, localFns));
      }
    }

    const control: Partial<Record<DecorFamily, vscode.Range[]>> = {};

    if (colors.highlightControl) {
      const hits = is4gl
        ? fgl.findControlKeywordOffsets(text)
        : spl.findControlKeywordOffsets(text);
      for (const hit of hits) {
        const list = control[hit.family] ?? (control[hit.family] = []);
        list.push(
          new vscode.Range(doc.positionAt(hit.start), doc.positionAt(hit.end)),
        );
      }
    }

    return {
      version: doc.version,
      params,
      locals,
      functions,
      builtins,
      control,
    };
  }

  private apply(editor: vscode.TextEditor, ranges: CachedRanges): void {
    editor.setDecorations(this.paramDecoration!, ranges.params);
    editor.setDecorations(this.localDecoration!, ranges.locals);
    editor.setDecorations(this.functionDecoration!, ranges.functions);
    editor.setDecorations(this.builtinDecoration!, ranges.builtins);

    for (const [family, decoration] of this.controlDecorations) {
      editor.setDecorations(
        decoration,
        this.colors.highlightControl ? (ranges.control[family] ?? []) : [],
      );
    }
  }
}
