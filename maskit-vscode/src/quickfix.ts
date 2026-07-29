import * as vscode from 'vscode';

export class MaskItQuickFixProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[] {
        // Find MaskIt diagnostics in the given range
        const diagnostics = context.diagnostics.filter(d => d.source === 'MaskIt');
        if (diagnostics.length === 0) {
            return [];
        }

        const actions: vscode.CodeAction[] = [];

        for (const diagnostic of diagnostics) {
            actions.push(this.createExtractToEnvAction(document, diagnostic));
            actions.push(this.createIgnoreCommentAction(document, diagnostic));
        }

        return actions;
    }

    private createExtractToEnvAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const action = new vscode.CodeAction('Extract secret to environment variable', vscode.CodeActionKind.QuickFix);
        action.edit = new vscode.WorkspaceEdit();
        // Simple extraction heuristic for demo purposes
        const secretText = document.getText(diagnostic.range);
        const replacementText = `process.env.SECRET_KEY /* Extracted by MaskIt */`;
        action.edit.replace(document.uri, diagnostic.range, replacementText);
        action.diagnostics = [diagnostic];
        action.isPreferred = true;
        // Audit log command would be hooked up here
        action.command = {
            command: 'maskit.auditLog',
            title: 'Audit Log Extraction',
            arguments: ['extracted_secret', document.uri.fsPath]
        };
        return action;
    }

    private createIgnoreCommentAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const action = new vscode.CodeAction('Add maskit-ignore comment', vscode.CodeActionKind.QuickFix);
        action.edit = new vscode.WorkspaceEdit();
        
        // Find start of line to insert comment above
        const line = document.lineAt(diagnostic.range.start.line);
        const insertPosition = new vscode.Position(line.lineNumber, 0);
        
        action.edit.insert(document.uri, insertPosition, `// maskit-ignore-next-line\n`);
        action.diagnostics = [diagnostic];
        
        action.command = {
            command: 'maskit.auditLog',
            title: 'Audit Log Exception',
            arguments: ['ignored_secret', document.uri.fsPath]
        };
        return action;
    }
}
