#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const expected = ['maskit-chrome.zip','maskit-edge.zip','maskit-firefox.zip','maskit-opera.zip','maskit-extension.zip','maskit-cli.tar.gz','maskit-mcp.tar.gz'];
for (const name of expected) {
  const file = path.join(dist, name);
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) throw new Error(`Missing or empty artifact: ${name}`);
}
for (const name of expected.filter((file) => file.endsWith('.zip'))) {
  const listing = execFileSync('unzip', ['-Z1', path.join(dist, name)], { encoding: 'utf8' });
  if (!listing.split('\n').includes('manifest.json')) throw new Error(`${name} does not contain manifest.json`);
}
const checksums = path.join(dist, 'SHA256SUMS.txt');
if (fs.existsSync(checksums)) {
  const text = fs.readFileSync(checksums, 'utf8');
  for (const name of expected) if (!text.includes(name)) throw new Error(`Checksum missing for ${name}`);
}
console.log(`Release artifact verification passed: ${expected.length} artifacts present.`);
