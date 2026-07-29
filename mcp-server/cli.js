#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const engine = require('../engine/index');
const { simulatePolicy } = require('../engine/simulation');
const config = require('./config');
const { renderReportHtml } = require('../engine/report-generator');
const args = process.argv.slice(2); const json = args.includes('--json'); const command = args[0]; const positional = args.slice(1).filter(arg => !arg.startsWith('--')); const input = positional.join(' ');
function print(v) { console.log(JSON.stringify(v, null, 2)); }
function compact(result) { if (!result.findings.length) return console.log('No sensitive data found.'); console.log(`Found ${result.findings.length} sensitive item(s):`); result.findings.forEach(f => console.log(`  - ${f.type} [${f.severity}]`)); console.log(`Risk score: ${result.riskScore} (${result.riskLevel})`); }
function readFile(filePath) { try { return fs.readFileSync(filePath, 'utf8'); } catch (error) { console.error(`Error reading file: ${error.message}`); process.exit(1); } }
function usage() { console.log('Maskit CLI\n  scan <text> [--json]\n  scan-file <path> [--json] [--exit-on-risk]\n  redact <text> [--json]\n  risk <text> [--json]\n  report generate <events.json> [--output reports] [--json]\n  simulate <text> [--json]'); }
function requireInput() { if (!input) { console.error('Error: text argument required'); process.exit(1); } }
if (command === 'report') {
  if (positional[0] !== 'generate' || !positional[1]) { usage(); process.exitCode = 1; } else {
    const events = JSON.parse(readFile(positional[1])); const outputIndex = args.indexOf('--output'); const outputDir = outputIndex >= 0 ? args[outputIndex + 1] : path.join(process.cwd(), 'reports'); const report = { schemaVersion: '0.1', generatedAt: new Date().toISOString(), device: { deviceId: process.env.MASKIT_DEVICE_ID || require('os').hostname(), platform: process.platform }, maskit: { version: '2.4.0' }, policy: { version: 'unknown', mode: 'unknown', status: 'unknown' }, aiInventory: [], securityEvents: { windowDays: 7, total: events.length }, risk: { level: events.length ? 'high' : 'unknown', score: events.length ? 25 : 0 }, evidence: { observed: [`${events.length} local evidence event(s) supplied`], calculated: [], unknown: ['Whether detected credentials are active', 'Whether content was submitted outside observed surfaces'] }, privacy: { metadataOnly: true, rawPromptsCollected: false, rawFilesCollected: false, rawClipboardCollected: false, rawSecretsStored: false } }; fs.mkdirSync(outputDir, { recursive: true }); fs.writeFileSync(path.join(outputDir, 'ai-security-report.html'), renderReportHtml(report, events)); fs.writeFileSync(path.join(outputDir, 'ai-security-report.json'), JSON.stringify(report, null, 2)); if (json) print({ outputDir, report }); else console.log(`AI Security Report generated locally in ${outputDir}`);
  }
} else {
  switch (command) {
    case 'scan': { requireInput(); const result = engine.scanText(input, { ...config.readConfig(), _context: { source: 'cli', app: 'maskit-cli' } }); if (json) print(result); else compact(result); process.exitCode = result.findings.length ? 1 : 0; break; }
    case 'scan-file': { const filePath = positional[0]; if (!filePath) { console.error('Error: file path required'); process.exit(1); } const result = engine.scanText(readFile(filePath), { ...config.readConfig(), _context: { source: 'cli', app: 'maskit-cli' } }); if (json) print(result); else compact(result); if (args.includes('--exit-on-risk') && result.findings.length) process.exitCode = 1; break; }
    case 'redact': { requireInput(); const result = engine.scanText(input, { ...config.readConfig(), _context: { source: 'cli', app: 'maskit-cli' } }); if (json) print({ redactedText: result.redactedText, findings: result.findings }); else console.log(result.redactedText); break; }
    case 'risk': { requireInput(); const result = engine.scanText(input, { ...config.readConfig(), _context: { source: 'cli', app: 'maskit-cli' } }); if (json) print({ riskScore: result.riskScore, riskLevel: result.riskLevel }); else console.log(`Risk score: ${result.riskScore}\nRisk level: ${result.riskLevel}\nFindings: ${result.findings.length}`); break; }
    case 'simulate': { requireInput(); const result = simulatePolicy(engine, input, { ...config.readConfig(), _context: { source: 'cli', app: 'simulation' } }); if (json) print(result); else console.log(result.redactedText); break; }
    default: usage(); process.exitCode = command ? 1 : 0;
  }
}
