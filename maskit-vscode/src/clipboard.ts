import * as vscode from 'vscode';
import { scanText } from './scanner';

export function registerClipboardProtection(context: vscode.ExtensionContext) {
  // Command to manually scan clipboard
  context.subscriptions.push(
    vscode.commands.registerCommand('maskit.scanClipboard', async () => {
      const clipboardText = await vscode.env.clipboard.readText();
      if (!clipboardText) {
        vscode.window.showInformationMessage("Clipboard is empty.");
        return;
      }
      
      const result = scanText(clipboardText, "plaintext");
      if (result.findings.length === 0) {
        vscode.window.showInformationMessage("MaskIt: Clipboard content is clean.");
      } else {
        const list = result.findings.map(f => `${f.type} (${f.severity})`).join(", ");
        vscode.window.showWarningMessage(
          `MaskIt Warning: Sensitive data found in clipboard: ${list}`
        );
      }
    })
  );

  // Best-effort selection copy interception override
  try {
    const disposable = vscode.commands.registerTextEditorCommand('editor.action.clipboardCopyAction', async (textEditor) => {
      const selection = textEditor.selection;
      if (selection.isEmpty) {
        await vscode.commands.executeCommand('default:editor.action.clipboardCopyAction');
        return;
      }

      const text = textEditor.document.getText(selection);
      const config = vscode.workspace.getConfiguration('maskit');
      if (!config.get('enabled') || !config.get('copyProtection')) {
        await vscode.commands.executeCommand('default:editor.action.clipboardCopyAction');
        return;
      }

      const scanResult = scanText(text, textEditor.document.languageId);
      if (scanResult.findings.length > 0) {
        const blockFinding = scanResult.findings.find(f => f.action === 'block');
        const warnFinding = scanResult.findings.find(f => f.action === 'warn' || f.action === 'redact');
        
        if (blockFinding) {
          vscode.window.showErrorMessage(
            `MaskIt blocked copying selection due to sensitive credentials: ${blockFinding.type}`
          );
          return;
        }

        if (warnFinding) {
          const choice = await vscode.window.showWarningMessage(
            `MaskIt Warning: Sensitive data (${warnFinding.type}) detected. Copy anyway?`,
            'Copy Anyway',
            'Cancel'
          );
          if (choice !== 'Copy Anyway') {
            return;
          }
        }
      }

      await vscode.commands.executeCommand('default:editor.action.clipboardCopyAction');
    });

    context.subscriptions.push(disposable);
  } catch (err) {
    console.warn("Best-effort copy override registration skipped:", err);
  }
}
