#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const files = ['pii.json','financial.json','secrets.json'];
const rules = files.flatMap((file) => JSON.parse(fs.readFileSync(path.join(root, 'maskit-core', 'rules', file), 'utf8')).rules || []);
const output = `const MASKIT_RULE_BUNDLE = ${JSON.stringify(rules)};\n`;
fs.writeFileSync(path.join(root, 'browser-rules.js'), output);
console.log(`Generated ${rules.length} browser rules from maskit-core.`);
