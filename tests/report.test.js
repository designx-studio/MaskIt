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
assert.ok(!Object.values(generated.aiInventory).some(item => Object.keys(item).some(key => ['content', 'secret', 'prompt'].includes(key))));

const now = new Date().toISOString();
const inventoryFile = writeInventory([{ tool: 'Claude Desktop', surface: 'desktop', status: 'unknown', firstSeen: now, lastSeen: now }], config);
const withInventory = report.generate({ days: 30 });
assert.strictEqual(withInventory.aiInventory[0].tool, 'Claude Desktop');
assert.ok(inventoryFile.endsWith('ai_inventory.json'));
console.log('report.test.js passed!');
