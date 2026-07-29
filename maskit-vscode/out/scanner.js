"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanText = scanText;
const vscode = require("vscode");
// Resolve and import engine dynamically
const engine = require('../../engine');
function scanText(text, languageId = 'plaintext') {
    const defaults = engine.MASKIT_DEFAULTS;
    const scanSettings = {
        ...defaults,
        _context: {
            source: "ide",
            application: "vscode",
            contentType: "source_code",
            content: text,
            metadata: {
                language: languageId,
                workspace: vscode.workspace.name || "local"
            }
        }
    };
    const result = engine.evaluatePolicy(text, scanSettings);
    const findings = result.findings.map((f) => {
        const policyDecision = result.policyDecisions.find((d) => d.finding?.type === f.type);
        const typeName = f.ruleName || f.type;
        return {
            type: typeName,
            severity: f.severity || 'high',
            action: policyDecision?.action || 'warn',
            value: f.value,
            message: `Critical: ${typeName} credential detected. Suggested action: Move credential into environment variables.`
        };
    });
    return {
        findings,
        allowed: result.allowed
    };
}
//# sourceMappingURL=scanner.js.map