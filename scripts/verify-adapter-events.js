#!/usr/bin/env node
const assert = require('assert');
const engine = require('../engine');
const { createContextEvent, validateContextEvent } = require('../engine/context');
const required = ['schemaVersion','eventId','timestamp','source','application','dataType','confidence','risk','policy','action','explanation'];
function assertEvent(event, label) {
  const validation = validateContextEvent(event);
  assert.ok(validation.valid, `${label}: ${validation.errors.join(', ')}`);
  for (const field of required) assert.ok(Object.prototype.hasOwnProperty.call(event, field), `${label}: missing ${field}`);
  assert.ok(!('value' in event) && !('matchedValue' in event), `${label}: raw value persisted`);
}
for (const source of ['cli','mcp','browser','windows','vscode']) {
  const result = engine.scanText('Contact test@example.com with fake key AKIAIOSFODNN7EXAMPLE', { _context: { source, app: `adapter-${source}` } });
  assert.ok(result.events.length, `${source}: no events`);
  result.events.forEach((event) => assertEvent(event, source));
}
assertEvent(createContextEvent({ source: 'ci', application: 'contract-test', dataType: 'EMAIL', matchedValue: 'test@example.com', explanation: 'fixture' }), 'fixture');
console.log('Adapter canonical event contract passed for cli, mcp, browser, windows, and ci fixtures.');
