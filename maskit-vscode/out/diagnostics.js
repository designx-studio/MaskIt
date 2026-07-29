"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDiagnostics = registerDiagnostics;
exports.triggerScan = triggerScan;
exports.getActiveDiagnostics = getActiveDiagnostics;
const vscode = require("vscode");
const scanner_1 = require("./scanner");
const context_1 = require("./context");
let diagnosticCollection;
function registerDiagnostics(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('maskit');
    context.subscriptions.push(diagnosticCollection);
    // Monitor text changes and open files to run real-time diagnostics
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => triggerScan(doc)));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => triggerScan(event.document)));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => triggerScan(doc)));
    // Scan currently active text editors upon activation
    vscode.window.visibleTextEditors.forEach(editor => {
        if (editor)
            triggerScan(editor.document);
    });
}
function triggerScan(document) {
    if (document.uri.scheme !== 'file')
        return [];
    const config = vscode.workspace.getConfiguration('maskit');
    if (!config.get('enabled')) {
        diagnosticCollection.set(document.uri, []);
        return [];
    }
    const text = document.getText();
    const scanResult = (0, scanner_1.scanText)(text, document.languageId);
    const diagnostics = [];
    scanResult.findings.forEach(finding => {
        if (finding.value) {
            let index = text.indexOf(finding.value);
            while (index !== -1) {
                const startPos = document.positionAt(index);
                const endPos = document.positionAt(index + finding.value.length);
                const range = new vscode.Range(startPos, endPos);
                const severity = finding.severity === 'critical'
                    ? vscode.DiagnosticSeverity.Error
                    : vscode.DiagnosticSeverity.Warning;
                const diagnostic = new vscode.Diagnostic(range, finding.message, severity);
                diagnostic.source = 'MaskIt';
                diagnostic.code = finding.type;
                diagnostics.push(diagnostic);
                index = text.indexOf(finding.value, index + 1);
            }
            // Log event to shared audit.jsonl evidence trail
            (0, context_1.logEvidenceEvent)({
                type: finding.type,
                severity: finding.severity,
                action: finding.action,
                value: finding.value
            });
        }
    });
    diagnosticCollection.set(document.uri, diagnostics);
    return scanResult.findings;
}
function getActiveDiagnostics(document) {
    const collection = diagnosticCollection.get(document.uri);
    return collection ? Array.from(collection) : [];
}
//# sourceMappingURL=diagnostics.js.map