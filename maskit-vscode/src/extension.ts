import * as vscode from 'vscode';
import { registerDiagnostics } from './diagnostics';
import { registerClipboardProtection } from './clipboard';
import { registerCopilotProtection } from './copilot';
import { scanCurrentFile, scanSelection, showFindings, explainFinding } from './findings';

export function activate(context: vscode.ExtensionContext) {
  console.log('MaskIt Extension is now active.');

  // Register diagnostics linter
  registerDiagnostics(context);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('maskit.scanCurrentFile', scanCurrentFile)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('maskit.scanSelection', scanSelection)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('maskit.showFindings', showFindings)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('maskit.explainFinding', explainFinding)
  );

  // Register clipboard protection hooks
  registerClipboardProtection(context);

  // Register AI integration hooks
  registerCopilotProtection(context);
}

export function deactivate() {
  console.log('MaskIt Extension is now deactivated.');
}
