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

    const hashedValue = engine.hashSensitive(event.value);

    // Format event strictly using the unified Context evidence schema
    const entry = JSON.stringify({
      schemaVersion: "1.0",
      eventId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      source: "ide",
      application: "vscode",
      user: "local",
      device: require('os').hostname() || "local-machine",
      dataType: event.type,
      confidence: 1.0,
      risk: event.severity === 'critical' ? 100 : (event.severity === 'high' ? 80 : 50),
      policy: {
        name: "default",
        version: "1.0",
        result: event.action
      },
      action: event.action,
      explanation: `Credential of type ${event.type} detected in VS Code.`,
      matchedValueHash: hashedValue
    });

    fs.appendFileSync(logPath, entry + "\n", 'utf8');
  } catch (err) {
    console.error("Failed to write MaskIt evidence log:", err);
  }
}
