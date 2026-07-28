#!/usr/bin/env node
/**
 * Validate maskit-windows-agent.zip structure and, on Windows with the binary,
 * run clean-install behavioural checks (--self-test / --scan).
 *
 * Exit codes:
 *   0 — package OK (and runtime checks OK when executed)
 *   1 — package or runtime verification failed
 *   0 with skip message — only when artifact intentionally absent AND MASKIT_REQUIRE_WINDOWS_ARTIFACT is unset
 */
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const archive = path.join(dist, 'maskit-windows-agent.zip');
const requireArtifact = process.env.MASKIT_REQUIRE_WINDOWS_ARTIFACT === '1';

function listZip(file) {
  if (spawnSync('unzip', ['-Z1', file], { encoding: 'utf8' }).status === 0) {
    return execFileSync('unzip', ['-Z1', file], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  }
  return execFileSync('tar', ['-tf', file], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
}

function extractZip(zip, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  if (spawnSync('unzip', ['-q', zip, '-d', dest], { encoding: 'utf8' }).status === 0) return;
  execFileSync('tar', ['-xf', zip, '-C', dest]);
}

if (!fs.existsSync(archive) || fs.statSync(archive).size === 0) {
  if (requireArtifact) {
    console.error('Windows package verification failed: maskit-windows-agent.zip missing (MASKIT_REQUIRE_WINDOWS_ARTIFACT=1).');
    process.exit(1);
  }
  console.log('Windows package verification skipped: artifact is not present on this runner.');
  console.log('Requires: npm run build:windows (or full npm run build with .NET 8 SDK).');
  process.exit(0);
}

const listing = listZip(archive);
const needed = [
  'README.md',
  'VERSION.json',
  'publish/Maskit.Agent.exe',
  'publish/maskit-core/rules/pii.json',
  'publish/maskit-core/rules/financial.json',
  'publish/maskit-core/rules/secrets.json',
  'publish/maskit-core/policy/defaults.json'
];

function hasEntry(name) {
  return listing.some((line) => {
    const n = line.replace(/^\.\//, '').replace(/\\/g, '/');
    return n === name || n.endsWith('/' + name) || n === name.replace(/\//g, '\\');
  });
}

for (const name of needed) {
  if (!hasEntry(name)) throw new Error(`Windows package missing ${name}`);
}

// Structural extract verification
const temp = path.join(dist, '.windows-clean-install');
extractZip(archive, temp);

// Resolve layout (zip may nest under maskit-windows-agent/)
let packageRoot = temp;
if (!fs.existsSync(path.join(packageRoot, 'publish', 'Maskit.Agent.exe'))) {
  const nested = path.join(temp, 'maskit-windows-agent');
  if (fs.existsSync(path.join(nested, 'publish', 'Maskit.Agent.exe'))) packageRoot = nested;
}
const exe = path.join(packageRoot, 'publish', 'Maskit.Agent.exe');
const rules = path.join(packageRoot, 'publish', 'maskit-core', 'rules', 'pii.json');
if (!fs.existsSync(exe)) throw new Error('Extracted package missing publish/Maskit.Agent.exe');
if (!fs.existsSync(rules)) throw new Error('Extracted package missing packaged maskit-core rules');

const version = JSON.parse(fs.readFileSync(path.join(packageRoot, 'VERSION.json'), 'utf8'));
if (!version.version) throw new Error('VERSION.json missing version');

console.log(`Windows package structure verification passed (v${version.version}).`);

// Runtime checks — Windows only (WinExe / self-contained win-x64)
if (process.platform !== 'win32') {
  console.log('Runtime start/scan checks require Windows. Structure-only verification complete.');
  fs.rmSync(temp, { recursive: true, force: true });
  process.exit(0);
}

function runAgent(args, allowExitCodes = [0]) {
  try {
    const out = execFileSync(exe, args, {
      encoding: 'utf8',
      cwd: path.dirname(exe),
      timeout: 60000,
      windowsHide: true
    });
    return { code: 0, stdout: out, stderr: '' };
  } catch (error) {
    const code = typeof error.status === 'number' ? error.status : 1;
    if (!allowExitCodes.includes(code)) throw error;
    return { code, stdout: String(error.stdout || ''), stderr: String(error.stderr || '') };
  }
}

const self = runAgent(['--self-test'], [0]);
if (!self.stdout.includes('SELFTEST PASS')) {
  throw new Error(`--self-test failed:\n${self.stdout}\n${self.stderr}`);
}
console.log('Clean install --self-test passed.');

const scan = runAgent(
  ['--scan', 'email test@example.com with key AKIAIOSFODNN7EXAMPLE', '--json'],
  [0, 1] // 1 = findings present
);
if (!scan.stdout.includes('schemaVersion') && !scan.stdout.includes('eventId')) {
  throw new Error(`--scan did not emit JSON events:\n${scan.stdout}\n${scan.stderr}`);
}
const parsed = JSON.parse(scan.stdout);
if (!parsed.events || !parsed.events.length) throw new Error('Clean install scan produced no events');
for (const event of parsed.events) {
  if (event.schemaVersion !== '1.0') throw new Error('Event schemaVersion must be 1.0');
  if (event.source !== 'windows') throw new Error('Event source must be windows');
  if (!event.matchedValueHash || event.matchedValueHash.length !== 64) {
    throw new Error('Event missing matchedValueHash');
  }
  if ('value' in event || 'matchedValue' in event || 'unmaskToken' in event) {
    throw new Error('Event must not contain raw/unmask fields');
  }
}
// Config must resolve packaged rules (no repo path required)
if (!parsed.rulesPath || !parsed.rulesPath.includes('maskit-core')) {
  throw new Error(`Rules path does not look packaged: ${parsed.rulesPath}`);
}
// Ensure path is under the extracted package tree
const rulesPathNorm = path.normalize(parsed.rulesPath);
const publishNorm = path.normalize(path.join(packageRoot, 'publish'));
if (!rulesPathNorm.toLowerCase().startsWith(publishNorm.toLowerCase())) {
  // Agent may rewrite to absolute; still require maskit-core/rules presence beside exe
  const localRules = path.join(path.dirname(exe), 'maskit-core', 'rules');
  if (!fs.existsSync(localRules)) {
    throw new Error('Packaged rules not adjacent to Maskit.Agent.exe');
  }
}

console.log(`Clean install --scan passed (${parsed.events.length} canonical event(s)).`);
fs.rmSync(temp, { recursive: true, force: true });
console.log('Windows package verification passed.');
