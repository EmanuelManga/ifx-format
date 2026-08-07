import * as vscode from "vscode";
import { formatInformixSpl, type FormatOptions } from "./formatter";
import {
  formatInformix4gl,
  type Format4glOptions,
} from "./formatter-4gl";
import { readHighlightColors, VariableHighlighter } from "./highlight";
import {
  applyCustomFileIcons,
  customFileIconsSettingId,
} from "./file-icons";

const LANG_SPL = "informix-spl";
const LANG_4GL = "informix-4gl";

function readSplOptions(): FormatOptions {
  const config = vscode.workspace.getConfiguration("ifxFormat");
  return {
    uppercase: config.get("uppercase", true),
    indentSize: config.get("indentSize", 2),
    useTabs: config.get("useTabs", false),
    blankAfterQuery: config.get("blankAfterQuery", true),
    blankAfterIf: config.get("blankAfterIf", true),
    blankAfterReturning: config.get("blankAfterReturning", true),
    blankBeforeElseEndIf: config.get("blankBeforeElseEndIf", true),
    blankBeforeException: config.get("blankBeforeException", true),
    blankAfterException: config.get("blankAfterException", true),
    keepEndClosersTogether: config.get("keepEndClosersTogether", true),
    spaceBeforeCreateTableParen: config.get("spaceBeforeCreateTableParen", true),
    blankAroundDropTable: config.get("blankAroundDropTable", true),
    blankAfterCreateTable: config.get("blankAfterCreateTable", true),
  };
}

function read4glOptions(): Format4glOptions {
  const config = vscode.workspace.getConfiguration("ifxFormat.4gl");
  return {
    uppercase: config.get("uppercase", true),
    indentSize: config.get("indentSize", 2),
    useTabs: config.get("useTabs", false),
    blankAfterIf: config.get("blankAfterIf", true),
    blankBeforeElseEndIf: config.get("blankBeforeElseEndIf", true),
    blankBeforeBlock: config.get("blankBeforeBlock", true),
    blankAfterBlock: config.get("blankAfterBlock", true),
    keepEndClosersTogether: config.get("keepEndClosersTogether", true),
  };
}

function formatEdits(
  document: vscode.TextDocument,
  formatted: string,
): vscode.TextEdit[] {
  const text = document.getText();
  if (formatted === text) return [];
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(text.length),
  );
  return [vscode.TextEdit.replace(fullRange, formatted)];
}

function languageForEditor(doc: vscode.TextDocument): string {
  if (doc.languageId === LANG_SPL || doc.languageId === LANG_4GL) {
    return doc.languageId;
  }
  const name = doc.fileName.toLowerCase();
  if (name.endsWith(".4gl")) return LANG_4GL;
  return LANG_SPL;
}

export function activate(context: vscode.ExtensionContext): void {
  const highlighter = new VariableHighlighter();
  highlighter.recreateDecorations(readHighlightColors());
  highlighter.paintVisible();

  void applyCustomFileIcons(context);

  const splProvider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document) {
      return formatEdits(
        document,
        formatInformixSpl(document.getText(), readSplOptions()),
      );
    },
  };

  const fglProvider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document) {
      return formatEdits(
        document,
        formatInformix4gl(document.getText(), read4glOptions()),
      );
    },
  };

  const splSelector: vscode.DocumentSelector = [
    { language: LANG_SPL, scheme: "file" },
    { language: LANG_SPL, scheme: "untitled" },
  ];
  const fglSelector: vscode.DocumentSelector = [
    { language: LANG_4GL, scheme: "file" },
    { language: LANG_4GL, scheme: "untitled" },
  ];

  context.subscriptions.push(
    highlighter,
    vscode.languages.registerDocumentFormattingEditProvider(
      splSelector,
      splProvider,
    ),
    vscode.languages.registerDocumentFormattingEditProvider(
      fglSelector,
      fglProvider,
    ),
    vscode.commands.registerCommand("ifxFormat.format", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const lang = languageForEditor(editor.document);
      if (editor.document.languageId !== lang) {
        await vscode.languages.setTextDocumentLanguage(editor.document, lang);
      }

      await vscode.commands.executeCommand("editor.action.formatDocument");
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId !== LANG_SPL && e.document.languageId !== LANG_4GL) {
        return;
      }
      const editor = vscode.window.visibleTextEditors.find(
        (ed) => ed.document === e.document,
      );
      highlighter.schedule(editor);
    }),
    vscode.window.onDidChangeActiveTextEditor(() => {
      highlighter.paintVisible();
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => {
      highlighter.paintVisible();
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId !== LANG_SPL && doc.languageId !== LANG_4GL) return;
      highlighter.paintVisible();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("ifxFormat.syntax")) {
        highlighter.recreateDecorations(readHighlightColors());
        highlighter.paintVisible();
      }
      if (e.affectsConfiguration(customFileIconsSettingId())) {
        void applyCustomFileIcons(context);
      }
    }),
  );
}

export function deactivate(): void {}
