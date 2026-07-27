import * as vscode from "vscode";
import { formatInformixSpl, type FormatOptions } from "./formatter";
import { readHighlightColors, VariableHighlighter } from "./highlight";

const LANGUAGE_ID = "informix-spl";

function readOptions(): FormatOptions {
  const config = vscode.workspace.getConfiguration("ifxFormat");
  return {
    uppercase: config.get("uppercase", true),
    indentSize: config.get("indentSize", 2),
    useTabs: config.get("useTabs", false),
    blankAfterQuery: config.get("blankAfterQuery", true),
    blankAfterIf: config.get("blankAfterIf", true),
    blankAfterReturning: config.get("blankAfterReturning", true),
    blankBeforeElseEndIf: config.get("blankBeforeElseEndIf", true),
    keepEndClosersTogether: config.get("keepEndClosersTogether", true),
  };
}

function formatDocument(document: vscode.TextDocument): vscode.TextEdit[] {
  const text = document.getText();
  const formatted = formatInformixSpl(text, readOptions());

  if (formatted === text) {
    return [];
  }

  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(text.length),
  );

  return [vscode.TextEdit.replace(fullRange, formatted)];
}

export function activate(context: vscode.ExtensionContext): void {
  const highlighter = new VariableHighlighter();
  highlighter.recreateDecorations(readHighlightColors());

  const paint = () => {
    for (const editor of vscode.window.visibleTextEditors) {
      highlighter.refresh(editor);
    }
  };

  paint();

  const provider: vscode.DocumentFormattingEditProvider = {
    provideDocumentFormattingEdits(document) {
      return formatDocument(document);
    },
  };

  const selector: vscode.DocumentSelector = [
    { language: LANGUAGE_ID, scheme: "file" },
    { language: LANGUAGE_ID, scheme: "untitled" },
  ];

  context.subscriptions.push(
    highlighter,
    vscode.languages.registerDocumentFormattingEditProvider(selector, provider),
    vscode.commands.registerCommand("ifxFormat.format", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      if (editor.document.languageId !== LANGUAGE_ID) {
        await vscode.languages.setTextDocumentLanguage(
          editor.document,
          LANGUAGE_ID,
        );
      }

      await vscode.commands.executeCommand("editor.action.formatDocument");
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId !== LANGUAGE_ID) return;
      const editor = vscode.window.visibleTextEditors.find(
        (ed) => ed.document === e.document,
      );
      highlighter.schedule(editor);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      highlighter.schedule(editor);
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (doc.languageId !== LANGUAGE_ID) return;
      paint();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("ifxFormat.syntax")) return;
      highlighter.recreateDecorations(readHighlightColors());
      paint();
    }),
  );
}

export function deactivate(): void {}
