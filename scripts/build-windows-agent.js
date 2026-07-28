#!/usr/bin/env node
/**
 * Build and package the Maskit Windows agent release artifact.
 *
 * Produces: dist/maskit-windows-agent.zip
 * Layout:
 *   README.md
 *   VERSION.json
 *   parity-fixtures.json
 *   publish/
 *     Maskit.Agent.exe (+ deps)
 *     maskit-core/rules|policy|audit-schema
 *
 * Requires: .NET 8 SDK on PATH (or DOTNET_ROOT).
 * On non-Windows hosts, publishes with -p:EnableWindowsTargeting=true when possible.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const staging = path.join(distDir, 'maskit-windows-agent');
const publishDir = path.join(staging, 'publish');
const outZip = path.join(distDir, 'maskit-windows-agent.zip');
const pkg = require(path.join(root, 'package.json'));
const csproj = path.join(root, 'maskit-agent', 'Maskit.Agent', 'Maskit.Agent.csproj');

function commandExists(cmd) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [cmd], { encoding: 'utf8' }).status === 0;
}

function resolveDotnet() {
  if (process.env.DOTNET_ROOT) {
    const candidate = path.join(
      process.env.DOTNET_ROOT,
      process.platform === 'win32' ? 'dotnet.exe' : 'dotnet'
    );
    if (fs.existsSync(candidate)) return candidate;
  }
  const local = path.join(
    process.env.LOCALAPPDATA || '',
    'dotnet',
    process.platform === 'win32' ? 'dotnet.exe' : 'dotnet'
  );
  if (local && fs.existsSync(local)) return local;
  if (commandExists('dotnet')) return 'dotnet';
  return null;
}

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function zipDir(source, outZipPath) {
  if (fs.existsSync(outZipPath)) fs.unlinkSync(outZipPath);
  if (commandExists('zip')) {
    execFileSync('zip', ['-qr', outZipPath, '.'], { cwd: source, stdio: 'inherit' });
    return;
  }
  const ps = `Compress-Archive -Path (Join-Path '${source.replace(/'/g, "''")}' '*') -DestinationPath '${outZipPath.replace(/'/g, "''")}' -Force`;
  execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const dotnet = resolveDotnet();
if (!dotnet) {
  console.error('ERROR: .NET SDK not found. Install .NET 8 SDK or set DOTNET_ROOT.');
  console.error('Windows package was not built.');
  process.exit(2);
}

console.log(`Using dotnet: ${dotnet}`);
try {
  console.log(execFileSync(dotnet, ['--list-sdks'], { encoding: 'utf8' }).trim() || '(no sdks listed)');
} catch {
  /* continue — publish will fail clearly */
}

fs.mkdirSync(distDir, { recursive: true });
rmrf(staging);
fs.mkdirSync(publishDir, { recursive: true });

const publishArgs = [
  'publish',
  csproj,
  '--configuration', 'Release',
  '--runtime', 'win-x64',
  '--self-contained', 'true',
  '-p:PublishSingleFile=true',
  '-p:IncludeNativeLibrariesForSelfExtract=true',
  '-p:EnableWindowsTargeting=true',
  '--output', publishDir
];

console.log('Publishing Windows agent...');
execFileSync(dotnet, publishArgs, { cwd: root, stdio: 'inherit', env: process.env });

// Ensure maskit-core is present (csproj CopyToOutput should handle this; assert + copy as fallback)
const coreInPublish = path.join(publishDir, 'maskit-core');
if (!fs.existsSync(path.join(coreInPublish, 'rules', 'pii.json'))) {
  console.log('Copying maskit-core into publish output...');
  fs.cpSync(path.join(root, 'maskit-core'), coreInPublish, { recursive: true });
}

// Package metadata + docs + fixtures for --parity without repo
fs.copyFileSync(path.join(root, 'maskit-agent', 'README.md'), path.join(staging, 'README.md'));
fs.copyFileSync(path.join(root, 'parity-fixtures.json'), path.join(staging, 'parity-fixtures.json'));
fs.copyFileSync(path.join(root, 'parity-fixtures.json'), path.join(publishDir, 'parity-fixtures.json'));

const versionMeta = {
  name: 'maskit-windows-agent',
  version: pkg.version,
  builtAt: new Date().toISOString(),
  schemaVersion: '1.0',
  runtime: 'win-x64',
  selfContained: true,
  components: {
    rules: 'publish/maskit-core/rules',
    policy: 'publish/maskit-core/policy',
    eventSchema: 'publish/maskit-core/audit-schema/context-event.schema.json'
  },
  entrypoint: 'publish/Maskit.Agent.exe',
  modes: ['tray', '--scan', '--self-test', '--parity']
};
fs.writeFileSync(path.join(staging, 'VERSION.json'), JSON.stringify(versionMeta, null, 2) + '\n');
fs.writeFileSync(path.join(publishDir, 'VERSION.json'), JSON.stringify(versionMeta, null, 2) + '\n');

// Sanity: required files
const required = [
  path.join(publishDir, 'Maskit.Agent.exe'),
  path.join(publishDir, 'maskit-core', 'rules', 'pii.json'),
  path.join(publishDir, 'maskit-core', 'rules', 'financial.json'),
  path.join(publishDir, 'maskit-core', 'rules', 'secrets.json'),
  path.join(publishDir, 'maskit-core', 'policy', 'defaults.json'),
  path.join(staging, 'README.md')
];
for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Windows package missing required file: ${file}`);
}

zipDir(staging, outZip);
const hash = sha256File(outZip);
console.log(`Built ${outZip}`);
console.log(`SHA256  ${hash}`);
console.log(hash);
process.exit(0);
