import * as fs from 'fs';
import * as path from 'path';
const engine = require('../../engine');

export function getAuditLogPath(): string {
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? `${process.env.HOME}/Library/Application Support` : `${process.env.HOME}/.config`);
  return path.join(appData, 'Maskit', 'audit.jsonl');
}

export function logEvidenceEvent(event: { type: string; severity: string; action: string }): void {
  try {
    const logPath = getAuditLogPath();
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    const risk = ['critical', 'high', 'medium', 'low'].includes(event.severity) ? event.severity : 'medium';
    const result = event.action === 'blocked' ? 'block' : event.action === 'redacted' ? 'redact' : event.action === 'allowed' ? 'allow' : 'warn';
    const entry = engine.createContextEvent({
      source: 'cli', application: 'vscode', dataType: event.type, confidence: 0.85, risk,
      policy: { name: 'default', version: '1.0', result }, action: result,
      explanation: `A ${event.type} finding was handled in VS Code.`
    });
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.error('Failed to write MaskIt evidence log:', err);
  }
}
