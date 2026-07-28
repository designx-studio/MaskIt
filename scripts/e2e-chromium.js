#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist', 'maskit-chrome.zip');
if (!fs.existsSync(dist)) throw new Error('Build the packaged Chrome extension before running E2E');
const listing = execFileSync('unzip', ['-Z1', dist], { encoding: 'utf8' }).split('\n');
for (const file of ['manifest.json','popup.html','popup.js','background.js','content.js','settings.js','detector.js']) if (!listing.includes(file)) throw new Error(`Packaged Chrome extension missing ${file}`);
const manifest = JSON.parse(execFileSync('unzip', ['-p', dist, 'manifest.json'], { encoding: 'utf8' }));
if (manifest.manifest_version !== 3) throw new Error('Packaged Chrome extension is not Manifest V3');
if (!manifest.action?.default_popup || !manifest.background?.service_worker) throw new Error('Packaged Chrome extension missing runtime entry points');
console.log('Packaged Chromium extension E2E preflight passed.');
