import * as vscode from 'vscode';
import { triggerScan, getActiveDiagnostics } from './diagnostics';
import { scanText } from './scanner';

export function scanCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return vscode.window.showInformationMessage('No active text editor open.');
  const findings = triggerScan(editor.document);
  if (!findings.length) return vscode.window.showInformationMessage('MaskIt: No sensitive credentials detected in this file.');
  const critical = findings.filter(f => f.severity === 'critical' || f.severity === 'high');
  const choice = vscode.window.showWarningMessage(`MaskIt detected ${findings.length} sensitive item(s).${critical.length ? ` ${critical.length} require review.` : ''}`, { modal: false }, 'Review findings', 'Cancel');
  choice.then(selected => { if (selected === 'Review findings') showFindings(); });
}

export function scanSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return vscode.window.showInformationMessage('No active text editor open.');
  if (editor.selection.isEmpty) return vscode.window.showInformationMessage('No text selected.');
  const result = scanText(editor.document.getText(editor.selection), editor.document.languageId);
  if (!result.findings.length) return vscode.window.showInformationMessage('MaskIt: Selection is clean.');
  vscode.window.showWarningMessage(`MaskIt detected ${result.findings.length} sensitive item(s) in the selection.`, { modal: false }, 'Review findings', 'Cancel').then(choice => { if (choice === 'Review findings') showFindings(); });
}

export function showFindings() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return vscode.window.showInformationMessage('No active editor.');
  const diagnostics = getActiveDiagnostics(editor.document);
  if (!diagnostics.length) return vscode.window.showInformationMessage('No findings recorded for this file.');
  const items = diagnostics.map(d => ({ label: `${d.code} · ${d.severity === vscode.DiagnosticSeverity.Error ? 'Critical' : 'Review'}`, description: d.message, diagnostic: d }));
  vscode.window.showQuickPick(items, { placeHolder: 'Select a finding to review' }).then(selection => {
    if (!selection) return;
    editor.selection = new vscode.Selection(selection.diagnostic.range.start, selection.diagnostic.range.end);
    editor.revealRange(selection.diagnostic.range);
    explainFindingDetails(selection.diagnostic);
  });
}

export function explainFinding() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return vscode.window.showInformationMessage('No active editor.');
  const diagnostics = getActiveDiagnostics(editor.document);
  const underCursor = diagnostics.find(d => d.range.contains(editor.selection.active));
  if (underCursor) return explainFindingDetails(underCursor);
  showFindings();
}

function explainFindingDetails(diagnostic: vscode.Diagnostic) {
  const type = String(diagnostic.code || 'sensitive data');
  const critical = diagnostic.severity === vscode.DiagnosticSeverity.Error;
  const reason = critical ? 'A high-impact credential or sensitive-data pattern was detected.' : 'A sensitive-data pattern was detected and needs review.';
  vscode.window.showWarningMessage(`Detected: ${type}\nSeverity: ${critical ? 'Critical' : 'Review'}\nReason: ${reason}`, { modal: true }, 'Remove Secret', 'Review', 'Cancel').then(choice => {
    if (choice === 'Remove Secret') vscode.commands.executeCommand('maskit.extractSecret', vscode.window.activeTextEditor?.document.uri, diagnostic.range, vscode.window.activeTextEditor?.document.languageId);
  });
}
