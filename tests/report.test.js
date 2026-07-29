const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const report = require('../mcp-server/report');
const { renderReportHtml } = require('../engine/report-generator');
const { writeInventory } = require('../mcp-server/inventory');
const config = require('../mcp-server/config');

const generated = report.generate({ days: 30 });
assert.strictEqual(generated.schemaVersion, '0.1');
assert.strictEqual(generated.privacy.metadataOnly, true);
assert.strictEqual(generated.privacy.rawPromptsCollected, false);
assert.strictEqual(generated.privacy.rawFilesCollected, false);
assert.strictEqual(generated.privacy.rawClipboardCollected, false);
assert.strictEqual(generated.privacy.rawSecretsStored, false);
assert.ok(!JSON.stringify(generated).includes('matchedValue'));
assert.ok(!JSON.stringify(generated).includes('prompt'));
assert.ok(!JSON.stringify(generated).includes('clipboard'));

const rawSecret = 'AKIAIOSFODNN7EXAMPLE';
const html = renderReportHtml(generated, [{ timestamp: generated.generatedAt, source: 'cli', application: 'test', dataType: 'API_KEY', ruleId: 'API_KEY_AWS_ACCESS', action: 'blocked', risk: 'critical', confidence: 0.95, value: rawSecret }]);
assert.ok(html.includes('API_KEY_AWS_ACCESS'));
assert.ok(!html.includes(rawSecret));
assert.ok(!html.includes('matchedValueHash'));

const now = new Date().toISOString();
const inventoryFile = writeInventory([{ tool: 'Claude Desktop', surface: 'desktop', status: 'unknown', firstSeen: now, lastSeen: now }], config);
const withInventory = report.generate({ days: 30 });
assert.strictEqual(withInventory.aiInventory[0].tool, 'Claude Desktop');
assert.ok(inventoryFile.endsWith('ai_inventory.json'));

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maskit-report-'));
report.writeReport(withInventory, outputDir);
for (const name of ['ai-security-report.json', 'ai-security-report.md', 'ai-security-report.csv', 'ai-security-report.html']) assert.ok(fs.existsSync(path.join(outputDir, name)));
console.log('report.test.js passed!');
