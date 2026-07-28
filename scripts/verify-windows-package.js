#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const archive = path.join(root, 'dist', 'maskit-windows-agent.zip');
if (!fs.existsSync(archive)) { console.log('Windows package verification skipped: artifact is not present on this runner.'); process.exit(0); }
const listing = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
if (!listing.includes('README.md') || !listing.includes('publish/')) throw new Error('Windows package missing publish payload or README');
console.log('Windows package structure verification passed.');
