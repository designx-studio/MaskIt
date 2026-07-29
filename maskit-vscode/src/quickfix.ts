import * as vscode from 'vscode';
export class MaskItQuickFixProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
    const diagnostics = context.diagnostics.filter(d => d.source === 'MaskIt');
    return diagnostics.flatMap(d => [this.createExtractAction(document, d), this.createIgnoreAction(document, d)]);
  }
  private createExtractAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
    const action = new vscode.CodeAction('Suggest environment variable replacement', vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    action.command = { command: 'maskit.extractSecret', title: 'Confirm environment variable replacement', arguments: [document.uri, diagnostic.range, document.languageId] };
    return action;
  }
  private createIgnoreAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
    const action = new vscode.CodeAction('Add scoped maskit-ignore comment', vscode.CodeActionKind.QuickFix);
    action.diagnostics = [diagnostic];
    action.command = { command: 'maskit.addIgnore', title: 'Confirm scoped ignore', arguments: [document.uri, diagnostic.range] };
    return action;
  }
}
