import * as fs from 'fs';
import * as path from 'path';

const engine = require('../../engine');

export function getAuditLogPath(): string {
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
  return path.join(appData, "Maskit", "audit.jsonl");
}

export function logEvidenceEvent(event: { type: string, severity: string, action: string, value: string }) {
  try {
    const logPath = getAuditLogPath();
    const logDir = path.dirname(logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const canonicalEvent = engine.createEventFromFinding({
      finding: { type: event.type, severity: event.severity, value: event.value },
      decision: { action: event.action },
      context: { source: "cli", app: "vscode" }
    });

    fs.appendFileSync(logPath, JSON.stringify(canonicalEvent) + "\n", 'utf8');
  } catch (err) {
    console.error("Failed to write MaskIt evidence log:", err);
  }
}

