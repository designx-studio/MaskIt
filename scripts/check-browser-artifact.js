#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const zip = path.join(root, 'dist', 'maskit-chrome.zip');
if (!fs.existsSync(zip)) throw new Error('dist/maskit-chrome.zip is missing; run npm run build first');
const files = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean);
for (const file of ['manifest.json','browser-rules.js','detector.js','content.js','background.js','popup.html','popup.js','settings.js']) if (!files.includes(file)) throw new Error(`Chrome artifact missing ${file}`);
const manifest = JSON.parse(execFileSync('unzip', ['-p', zip, 'manifest.json'], { encoding: 'utf8' }));
if (manifest.manifest_version !== 3) throw new Error('Expected Manifest V3');
if (!manifest.content_scripts?.[0]?.js.includes('browser-rules.js')) throw new Error('Shared browser rules missing from content script');
const hash = crypto.createHash('sha256').update(fs.readFileSync(zip)).digest('hex');
const output = path.join(root, 'dist', 'maskit-chrome.zip.sha256');
fs.writeFileSync(output, `${hash}  maskit-chrome.zip\n`);
console.log(`Browser artifact passed: ${zip}`);
console.log(`SHA256: ${hash}`);
