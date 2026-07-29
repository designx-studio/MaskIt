import * as vscode from 'vscode';
import { scanText, MaskItFinding } from './scanner';
import { logEvidenceEvent } from './context';

let diagnosticCollection: vscode.DiagnosticCollection;
let findingCountListener: ((count: number) => void) | undefined;

export function registerDiagnostics(context: vscode.ExtensionContext, onFindingCount?: (count: number) => void) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection('maskit');
  findingCountListener = onFindingCount;
  context.subscriptions.push(diagnosticCollection);
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => triggerScan(doc)));
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => triggerScan(event.document)));
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => triggerScan(doc)));
  vscode.window.visibleTextEditors.forEach(editor => triggerScan(editor.document));
}

export function triggerScan(document: vscode.TextDocument): MaskItFinding[] {
  if (document.uri.scheme !== 'file') return [];
  const config = vscode.workspace.getConfiguration('maskit');
  if (!config.get('enabled', true)) {
    diagnosticCollection.set(document.uri, []);
    findingCountListener?.(0);
    return [];
  }
  const text = document.getText();
  const scanResult = scanText(text, document.languageId);
  const diagnostics: vscode.Diagnostic[] = [];
  scanResult.findings.forEach(finding => {
    if (!finding.value) return;
    let index = text.indexOf(finding.value);
    while (index !== -1) {
      const range = new vscode.Range(document.positionAt(index), document.positionAt(index + finding.value.length));
      const severity = finding.severity === 'critical' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;
      const diagnostic = new vscode.Diagnostic(range, finding.message, severity);
      diagnostic.source = 'MaskIt';
      diagnostic.code = finding.type;
      diagnostics.push(diagnostic);
      index = text.indexOf(finding.value, index + 1);
    }
    logEvidenceEvent({ type: finding.type, severity: finding.severity, action: finding.action });
  });
  diagnosticCollection.set(document.uri, diagnostics);
  findingCountListener?.(diagnostics.length);
  return scanResult.findings;
}

export function getActiveDiagnostics(document: vscode.TextDocument): vscode.Diagnostic[] {
  const collection = diagnosticCollection.get(document.uri);
  return collection ? Array.from(collection) : [];
}
