#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'engine/context.js',
  'engine/simulation.js',
  'maskit-core/audit-schema/context-event.schema.json',
  'popup.html',
  'popup.js'
];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing stabilization file: ${file}`);
}
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const popupJs = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');
for (const id of ['tl-dot','tl-label','toggle-wrap','pause-btn','exclude-btn','site-status','stat-total','stat-paste','stat-copy','stat-typing']) {
  if (!popupHtml.includes(`id="${id}"`)) throw new Error(`Popup control missing: ${id}`);
}
if (!popupJs.includes('if (dot)') || !popupJs.includes('if (label)')) throw new Error('Popup status rendering is not null-safe');
const context = require(path.join(root, 'engine', 'context.js'));
const event = context.createContextEvent({ source: 'cli', application: 'test', dataType: 'API_KEY', confidence: 0.99, risk: 'critical', policy: { name: 'default', version: '1', result: 'block' }, explanation: 'Credential detected in test input.' });
const validation = context.validateContextEvent(event);
if (!validation.valid) throw new Error(`Context event validation failed: ${validation.errors.join(', ')}`);
const simulation = require(path.join(root, 'engine', 'simulation.js'));
const engine = require(path.join(root, 'engine', 'index.js'));
const result = simulation.simulatePolicy(engine, 'Contact test@example.com', { redactFormat: 'tagged' });
if (result.mode !== 'simulation' || result.mutated !== false || !Array.isArray(result.explanations)) throw new Error('Policy simulation contract failed');
console.log('Stabilization verification passed.');
