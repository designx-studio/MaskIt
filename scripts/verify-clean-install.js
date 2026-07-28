#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const temp = path.join(root, '.clean-install');
fs.rmSync(temp, { recursive: true, force: true });
fs.mkdirSync(temp, { recursive: true });

// CLI package
const cli = path.join(temp, 'cli');
fs.mkdirSync(cli, { recursive: true });
execFileSync('tar', ['-xzf', path.join(dist, 'maskit-cli.tar.gz'), '-C', cli]);
const cliRoot = fs.existsSync(path.join(cli, 'cli.js'))
  ? cli
  : path.join(cli, 'maskit-cli');
let cliOutput = '';
try {
  cliOutput = execFileSync(
    process.execPath,
    [path.join(cliRoot, 'cli.js'), 'scan', 'email test@example.com', '--json'],
    { encoding: 'utf8' }
  );
} catch (error) {
  // CLI exits non-zero when findings exist — that is expected success for this check
  cliOutput = error.stdout ? String(error.stdout) : '';
  if (!cliOutput) throw error;
}
if (!cliOutput.includes('findings')) throw new Error('Clean CLI install did not produce findings');
const parsed = JSON.parse(cliOutput);
if (!parsed.events || !parsed.events[0] || parsed.events[0].schemaVersion !== '1.0') {
  throw new Error('Clean CLI install did not emit canonical events');
}
if (parsed.events[0].value || parsed.events[0].matchedValue) {
  throw new Error('Clean CLI install stored raw sensitive values in events');
}
console.log('Clean CLI installation verification passed.');

// MCP package — load tool handler outside repo
const mcp = path.join(temp, 'mcp');
fs.mkdirSync(mcp, { recursive: true });
execFileSync('tar', ['-xzf', path.join(dist, 'maskit-mcp.tar.gz'), '-C', mcp]);
const mcpRoot = fs.existsSync(path.join(mcp, 'mcp-server', 'server.js'))
  ? mcp
  : path.join(mcp, 'maskit-mcp');
const mcpServer = path.join(mcpRoot, 'mcp-server', 'server.js');
if (!fs.existsSync(mcpServer)) throw new Error('MCP package missing mcp-server/server.js');
// Require from package path
const prevCwd = process.cwd();
process.chdir(mcpRoot);
try {
  // Clear require cache for engine modules
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('maskit') || key.includes('engine')) delete require.cache[key];
  });
  // Direct engine require from packaged layout
  const engine = require(path.join(mcpRoot, 'engine', 'index.js'));
  const result = engine.scanText('email test@example.com', {
    _context: { source: 'mcp', app: 'clean-install' }
  });
  if (!result.findings.length) throw new Error('Clean MCP package engine produced no findings');
  if (!result.events[0] || result.events[0].schemaVersion !== '1.0') {
    throw new Error('Clean MCP package did not emit canonical events');
  }
  console.log('Clean MCP installation verification passed.');
} finally {
  process.chdir(prevCwd);
}

fs.rmSync(temp, { recursive: true, force: true });
console.log('Clean-install verification complete for CLI and MCP.');
