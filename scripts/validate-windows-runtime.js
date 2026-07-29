const assert = require('assert');
const http = require('http');

const required = process.env.MASKIT_REQUIRE_WINDOWS_RUNTIME === '1';
if (process.platform !== 'win32') {
  const message = 'Windows runtime validation requires a Windows VM. Measure idle CPU, memory, and health response time there.';
  if (required) throw new Error(message);
  console.log('SKIPPED: ' + message);
  process.exit(0);
}

const start = process.hrtime.bigint();
const request = http.get('http://127.0.0.1:41731/health', response => {
  response.resume();
  response.on('end', () => {
    const elapsed = Number(process.hrtime.bigint() - start) / 1e6;
    assert.strictEqual(response.statusCode, 200, `Health endpoint returned ${response.statusCode}`);
    assert.ok(elapsed < 100, `Health endpoint exceeded 100ms: ${elapsed.toFixed(2)}ms`);
    console.log(`Health response: ${elapsed.toFixed(2)}ms`);
    console.log('Record idle CPU and memory with Windows Performance Monitor while the service is idle.');
  });
});
request.on('error', error => {
  throw new Error(`Windows agent health endpoint unavailable: ${error.message}`);
});
