"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const diagnostics_1 = require("./diagnostics");
const clipboard_1 = require("./clipboard");
const copilot_1 = require("./copilot");
const findings_1 = require("./findings");
function activate(context) {
    console.log('MaskIt Extension is now active.');
    // Register diagnostics linter
    (0, diagnostics_1.registerDiagnostics)(context);
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('maskit.scanCurrentFile', findings_1.scanCurrentFile));
    context.subscriptions.push(vscode.commands.registerCommand('maskit.scanSelection', findings_1.scanSelection));
    context.subscriptions.push(vscode.commands.registerCommand('maskit.showFindings', findings_1.showFindings));
    context.subscriptions.push(vscode.commands.registerCommand('maskit.explainFinding', findings_1.explainFinding));
    // Register clipboard protection hooks
    (0, clipboard_1.registerClipboardProtection)(context);
    // Register AI integration hooks
    (0, copilot_1.registerCopilotProtection)(context);
}
function deactivate() {
    console.log('MaskIt Extension is now deactivated.');
}
//# sourceMappingURL=extension.js.map