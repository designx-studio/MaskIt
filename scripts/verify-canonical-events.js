#!/usr/bin/env node
const assert = require('assert');
const engine = require('../engine');
const required = ['schemaVersion','eventId','timestamp','source','application','dataType','confidence','risk','policy','action','explanation'];
const result = engine.scanText('Contact test@example.com with token AKIAIOSFODNN7EXAMPLE', { _context: { source: 'cli', app: 'verification' } });
assert.ok(result.events.length > 0, 'expected canonical events');
for (const event of result.events) {
  for (const field of required) assert.ok(Object.prototype.hasOwnProperty.call(event, field), `missing ${field}`);
  assert.ok(!Object.prototype.hasOwnProperty.call(event, 'value'), 'raw value must not be persisted');
  assert.ok(!Object.prototype.hasOwnProperty.call(event, 'matchedValue'), 'raw matched value must not be persisted');
}
console.log(`Canonical event verification passed: ${result.events.length} events.`);
