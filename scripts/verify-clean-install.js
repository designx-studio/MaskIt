#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const temp = path.join(root, '.clean-install');
fs.rmSync(temp, { recursive: true, force: true });
fs.mkdirSync(temp, { recursive: true });
const cli = path.join(temp, 'cli');
fs.mkdirSync(cli, { recursive: true });
execFileSync('tar', ['-xzf', path.join(dist, 'maskit-cli.tar.gz'), '-C', cli]);
const output = execFileSync(process.execPath, [path.join(cli, 'cli.js'), 'scan', 'email test@example.com', '--json'], { encoding: 'utf8' });
if (!output.includes('findings')) throw new Error('Clean CLI install did not produce findings');
console.log('Clean CLI installation verification passed.');
