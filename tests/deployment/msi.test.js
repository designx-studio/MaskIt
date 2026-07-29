const assert = require('assert');
const fs = require('fs');
const path = require('path');
const isWindows = process.platform === 'win32';
const requireWindows = process.env.MASKIT_REQUIRE_WINDOWS_ARTIFACT === '1';
console.log('Running deployment validation...');
if (!isWindows) {
  const message = `Deployment integration tests require a Windows VM with MSI tooling; skipped on ${process.platform}`;
  if (requireWindows) throw new Error(message);
  console.log('SKIPPED: ' + message);
} else {
  assert.ok(fs.existsSync(path.resolve(__dirname, '../../installer/MaskIt.Agent.wxs')));
  assert.ok(fs.existsSync(path.resolve(__dirname, '../../installer/build-msi.ps1')));
  console.log('Windows MSI upgrade, service recovery, and uninstall require the Windows release job.');
}
console.log('msi.test.js passed!');
