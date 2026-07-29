const assert = require('assert');
const report = require('../mcp-server/report');
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

const entries = [{ tool: 'Claude Desktop', surface: 'desktop', status: 'unknown', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString() }];
const inventoryFile = writeInventory(entries, config);
const withInventory = report.generate({ days: 30 });
assert.strictEqual(withInventory.aiInventory[0].tool, 'Claude Desktop');
assert.ok(!JSON.stringify(withInventory).includes('secret'));
console.log('report.test.js passed!');
