#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const expected = [
  'maskit-chrome.zip',
  'maskit-edge.zip',
  'maskit-firefox.zip',
  'maskit-opera.zip',
  'maskit-extension.zip',
  'maskit-cli.tar.gz',
  'maskit-mcp.tar.gz'
];

function listZip(file) {
  if (spawnSync('unzip', ['-Z1', file], { encoding: 'utf8' }).status === 0) {
    return execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split(/\r?\n/);
  }
  // tar lists zip contents on modern Windows/macOS/Linux
  return execFileSync('tar', ['-tf', file], { encoding: 'utf8' }).split(/\r?\n/);
}

function extractZipFile(zip, member) {
  if (spawnSync('unzip', ['-p', zip, member], { encoding: 'utf8' }).status === 0) {
    return execFileSync('unzip', ['-p', zip, member], { encoding: 'utf8' });
  }
  const tmp = path.join(dist, '.extract-tmp');
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  execFileSync('tar', ['-xf', zip, '-C', tmp], { encoding: 'utf8' });
  const full = path.join(tmp, member);
  if (!fs.existsSync(full)) throw new Error(`${zip} missing ${member}`);
  const text = fs.readFileSync(full, 'utf8');
  fs.rmSync(tmp, { recursive: true, force: true });
  return text;
}

for (const name of expected) {
  const file = path.join(dist, name);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    throw new Error(`Missing or empty artifact: ${name}`);
  }
}

for (const name of expected.filter((file) => file.endsWith('.zip'))) {
  const listing = listZip(path.join(dist, name));
  if (!listing.some((line) => line === 'manifest.json' || line.endsWith('/manifest.json') || line.replace(/^\.\//, '') === 'manifest.json')) {
    throw new Error(`${name} does not contain manifest.json`);
  }
  if (!listing.some((line) => line.includes('browser-rules.js'))) {
    throw new Error(`${name} missing shared browser-rules.js`);
  }
  if (!listing.some((line) => line.includes('context-event.js'))) {
    throw new Error(`${name} missing context-event.js canonical builder`);
  }
  const manifest = JSON.parse(extractZipFile(path.join(dist, name), 'manifest.json'));
  if (manifest.manifest_version !== 3) throw new Error(`${name} is not Manifest V3`);
}

const checksums = path.join(dist, 'SHA256SUMS.txt');
if (!fs.existsSync(checksums)) throw new Error('SHA256SUMS.txt missing');
const text = fs.readFileSync(checksums, 'utf8');
for (const name of expected) {
  if (!text.includes(name)) throw new Error(`Checksum missing for ${name}`);
  const line = text.split(/\r?\n/).find((l) => l.endsWith(name) || l.includes(`  ${name}`));
  if (!line) throw new Error(`Checksum line missing for ${name}`);
  const expectedHash = line.trim().split(/\s+/)[0];
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(dist, name))).digest('hex');
  if (expectedHash !== actual) throw new Error(`Checksum mismatch for ${name}`);
}

if (!fs.existsSync(path.join(dist, 'RELEASE-METADATA.json'))) {
  throw new Error('RELEASE-METADATA.json missing');
}

console.log(`Release artifact verification passed: ${expected.length} artifacts present with valid SHA-256.`);
