#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const zip = path.join(root, 'dist', 'maskit-chrome.zip');
if (!fs.existsSync(zip)) throw new Error('maskit-chrome.zip missing — run npm run build');

function listZip(file) {
  if (spawnSync('unzip', ['-Z1', file], { encoding: 'utf8' }).status === 0) {
    return execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  }
  return execFileSync('tar', ['-tf', file], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}

const listing = listZip(zip);
const required = [
  'manifest.json',
  'popup.html',
  'popup.js',
  'background.js',
  'content.js',
  'settings.js',
  'detector.js',
  'browser-rules.js',
  'context-event.js'
];
for (const file of required) {
  if (!listing.some((line) => line === file || line.endsWith('/' + file) || line.replace(/^\.\//, '') === file)) {
    throw new Error(`Packaged Chrome extension missing ${file}`);
  }
}

function extract(member) {
  if (spawnSync('unzip', ['-p', zip, member], { encoding: 'utf8' }).status === 0) {
    return execFileSync('unzip', ['-p', zip, member], { encoding: 'utf8' });
  }
  const tmp = path.join(root, 'dist', '.check-tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  execFileSync('tar', ['-xf', zip, '-C', tmp]);
  const text = fs.readFileSync(path.join(tmp, member), 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  return text;
}

const manifest = JSON.parse(extract('manifest.json'));
if (manifest.manifest_version !== 3) throw new Error('Packaged Chrome extension is not Manifest V3');
if (!manifest.action?.default_popup || !manifest.background?.service_worker) {
  throw new Error('Packaged Chrome extension missing runtime entry points');
}
if (!manifest.content_scripts?.[0]?.js?.includes('context-event.js')) {
  throw new Error('Content scripts must load context-event.js');
}
if (!manifest.content_scripts?.[0]?.js?.includes('browser-rules.js')) {
  throw new Error('Content scripts must load browser-rules.js from maskit-core');
}

console.log('Browser artifact check passed.');
