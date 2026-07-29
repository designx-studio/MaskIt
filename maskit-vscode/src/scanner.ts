import * as vscode from 'vscode';

// Resolve and import engine dynamically
const engine = require('../../engine');

export interface MaskItFinding {
  type: string;
  severity: string;
  action: string;
  value: string;
  message: string;
}

export function scanText(text: string, languageId: string = 'plaintext'): { findings: MaskItFinding[], allowed: boolean } {
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
  
  const findings: MaskItFinding[] = result.findings.map((f: any) => {
    const policyDecision = result.policyDecisions.find((d: any) => d.finding?.type === f.type);
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
