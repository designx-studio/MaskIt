import * as vscode from 'vscode';
import { registerDiagnostics } from './diagnostics';
import { registerClipboardProtection } from './clipboard';
import { registerCopilotProtection } from './copilot';
import { scanCurrentFile, scanSelection, showFindings, explainFinding } from './findings';
import { MaskItStatusBar } from './statusbar';
import { MaskItQuickFixProvider } from './quickfix';
import { setupGitHooks } from './git-hooks';

export function activate(context: vscode.ExtensionContext) {
  const statusBar = new MaskItStatusBar();
  context.subscriptions.push({ dispose: () => statusBar.dispose() });
  registerDiagnostics(context, count => statusBar.update(count));
  const extractSecret = async (uri: vscode.Uri, range: vscode.Range, languageId: string) => {
    const variable = await vscode.window.showInputBox({ prompt: 'Environment variable name', value: 'API_KEY', validateInput: v => /^[A-Z][A-Z0-9_]*$/.test(v) ? undefined : 'Use an uppercase environment variable name.' });
    if (!variable) return;
    const replacement = languageId === 'python' ? `os.environ["${variable}"]` : `process.env.${variable}`;
    const edit = new vscode.WorkspaceEdit(); edit.replace(uri, range, replacement); await vscode.workspace.applyEdit(edit);
  };
  const addIgnore = async (uri: vscode.Uri, range: vscode.Range) => {
    const reason = await vscode.window.showInputBox({ prompt: 'Reason for this exception', validateInput: v => v.trim() ? undefined : 'A reason is required.' });
    if (!reason) return;
    const expires = await vscode.window.showInputBox({ prompt: 'Expiration date (YYYY-MM-DD)', value: '2026-12-01', validateInput: v => /^\\d{4}-\\d{2}-\\d{2}$/.test(v) ? undefined : 'Use YYYY-MM-DD.' });
    if (!expires) return;
    const confirm = await vscode.window.showWarningMessage('Add a scoped MaskIt exception?', { modal: true }, 'Add exception');
    if (confirm !== 'Add exception') return;
    const document = await vscode.workspace.openTextDocument(uri);
    const line = document.lineAt(range.start.line);
    const edit = new vscode.WorkspaceEdit(); edit.insert(uri, new vscode.Position(line.lineNumber, 0), `// maskit-ignore-next-line reason="${reason.replace(/"/g, "'")}" expires="${expires}"\\n`); await vscode.workspace.applyEdit(edit);
  };
  context.subscriptions.push(
    vscode.commands.registerCommand('maskit.scanCurrentFile', scanCurrentFile),
    vscode.commands.registerCommand('maskit.scanSelection', scanSelection),
    vscode.commands.registerCommand('maskit.showFindings', showFindings),
    vscode.commands.registerCommand('maskit.explainFinding', explainFinding),
    vscode.commands.registerCommand('maskit.extractSecret', extractSecret),
    vscode.commands.registerCommand('maskit.addIgnore', addIgnore),
    vscode.commands.registerCommand('maskit.scanClipboard', async () => {
      const text = await vscode.env.clipboard.readText(); if (!text) return vscode.window.showInformationMessage('MaskIt: Clipboard is empty.');
      const result = require('./scanner').scanText(text, 'plaintext'); statusBar.update(result.findings.length); vscode.window.showInformationMessage(result.findings.length ? `MaskIt: ${result.findings.length} finding(s) detected.` : 'MaskIt: Clipboard is clean.');
    }),
    vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, new MaskItQuickFixProvider(), { providedCodeActionKinds: MaskItQuickFixProvider.providedCodeActionKinds })
  );
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath; if (root) setupGitHooks(root);
  registerClipboardProtection(context); registerCopilotProtection(context);
}
export function deactivate() { }
