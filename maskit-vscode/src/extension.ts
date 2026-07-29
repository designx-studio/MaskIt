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
  registerDiagnostics(context);
  context.subscriptions.push(
    vscode.commands.registerCommand('maskit.scanCurrentFile', scanCurrentFile),
    vscode.commands.registerCommand('maskit.scanSelection', scanSelection),
    vscode.commands.registerCommand('maskit.showFindings', showFindings),
    vscode.commands.registerCommand('maskit.explainFinding', explainFinding),
    vscode.commands.registerCommand('maskit.scanClipboard', async () => {
      const text = await vscode.env.clipboard.readText();
      if (!text) return vscode.window.showInformationMessage('MaskIt: Clipboard is empty.');
      const result = require('./scanner').scanText(text, 'plaintext');
      statusBar.update(result.findings.length);
      vscode.window.showInformationMessage(result.findings.length ? `MaskIt: ${result.findings.length} finding(s) detected.` : 'MaskIt: Clipboard is clean.');
    }),
    vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, new MaskItQuickFixProvider(), { providedCodeActionKinds: MaskItQuickFixProvider.providedCodeActionKinds })
  );
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (root) setupGitHooks(root);
  registerClipboardProtection(context);
  registerCopilotProtection(context);
}
export function deactivate() { }
