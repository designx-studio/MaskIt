const assert = require('assert');
const engine = require('../../engine');

function payload(size) {
  const line = 'const safeValue = "normal developer source text";\n';
  return line.repeat(Math.ceil(size / line.length)).slice(0, size);
}
function benchmark(size) {
  const text = payload(size);
  const before = process.memoryUsage().heapUsed;
  const start = process.hrtime.bigint();
  const result = engine.scanText(text);
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
  const heapDelta = process.memoryUsage().heapUsed - before;
  console.log(`${size} bytes: ${elapsedMs.toFixed(2)}ms, heap delta ${heapDelta} bytes, findings ${result.allFindings.length}`);
  assert.ok(elapsedMs < 100, `${size}-byte scan exceeded 100ms: ${elapsedMs.toFixed(2)}ms`);
  return { elapsedMs, heapDelta };
}

console.log('Running security performance benchmarks...');
benchmark(1024);
benchmark(100 * 1024);
benchmark(1024 * 1024);
console.log('performance.test.js passed!');
