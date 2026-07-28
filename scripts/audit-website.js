#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = path.resolve(__dirname, '..');
const websiteRoot = path.join(root, 'website');
const releaseAssets = [
  'maskit-chrome.zip', 'maskit-edge.zip', 'maskit-firefox.zip', 'maskit-opera.zip',
  'maskit-windows-agent.zip', 'maskit-mcp.tar.gz', 'maskit-cli.tar.gz'
];
const htmlFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) walk(file);
    else if (name.endsWith('.html')) htmlFiles.push(file);
  }
}
function fail(message) { console.error(`FAIL ${message}`); failures++; }
function ok(message) { console.log(`OK   ${message}`); }
function relative(from, target) { return path.relative(from, target).replaceAll(path.sep, '/'); }

let failures = 0;
walk(websiteRoot);
const refs = [];
const attrRe = /(?:href|src)=["']([^"']+)["']/gi;
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = attrRe.exec(text))) refs.push({ file, ref: match[1] });
}
for (const { file, ref } of refs) {
  if (!ref || ref.startsWith('#') || ref.startsWith('mailto:') || ref.startsWith('javascript:')) continue;
  if (/^https?:\/\/github\.com\/designx-studio\/MaskIt\/releases\/latest\/download\//.test(ref)) {
    const asset = ref.split('/').pop();
    if (!releaseAssets.includes(asset)) fail(`${relative(root, file)} references unknown release asset ${asset}`);
    else ok(`${relative(root, file)} release asset ${asset}`);
    continue;
  }
  if (/^https?:\/\//.test(ref)) { ok(`${relative(root, file)} external URL ${ref}`); continue; }
  const clean = ref.split('#')[0].split('?')[0];
  const target = path.resolve(path.dirname(file), clean);
  if (!fs.existsSync(target)) fail(`${relative(root, file)} -> missing ${ref}`);
  else ok(`${relative(root, file)} -> ${relative(root, target)}`);
}
for (const file of htmlFiles) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('..download-grid') || text.includes('mailto="') || text.includes('href="#"')) fail(`${relative(root, file)} contains malformed or placeholder markup`);
}
if (failures) { console.error(`\nWebsite audit failed with ${failures} issue(s).`); process.exit(1); }
console.log(`\nWebsite audit passed: ${htmlFiles.length} HTML file(s), ${refs.length} reference(s).`);
