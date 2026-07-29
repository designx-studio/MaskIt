const assert = require("assert");
const engine = require("../../engine");

console.log("Running performance.test.js...");

// Helper to generate dummy text content
function generatePayload(sizeKb) {
  let content = "const port = 8080;\n";
  const line = "console.log('Dummy text for performance benchmark payload');\n";
  const numLines = Math.floor((sizeKb * 1024) / line.length);
  for (let i = 0; i < numLines; i++) {
    // Occasionally inject a secret key to keep matching active
    if (i === Math.floor(numLines / 2)) {
      content += "const apiKey = 'AKIAIOSFODNN7EXAMPLE';\n";
    } else {
      content += line;
    }
  }
  return content;
}

function runBenchmark(sizeKb) {
  const payload = generatePayload(sizeKb);
  
  const startCpu = process.cpuUsage();
  const startTime = process.hrtime();
  
  const result = engine.scanText(payload);
  
  const diffTime = process.hrtime(startTime);
  const diffCpu = process.cpuUsage(startCpu);
  
  const durationMs = (diffTime[0] * 1000) + (diffTime[1] / 1000000);
  const cpuMs = (diffCpu.user + diffCpu.system) / 1000;
  
  console.log(`Payload Size: ${sizeKb}KB | Duration: ${durationMs.toFixed(2)}ms | CPU Time: ${cpuMs.toFixed(2)}ms | Findings: ${result.findings.length}`);
  
  return { durationMs, cpuMs };
}

// 1. Benchmarking 1KB (small developer buffer)
const bench1 = runBenchmark(1);
assert.ok(bench1.durationMs < 100, "1KB scan exceeded 100ms");

// 2. Benchmarking 100KB (typical source file size)
const bench100 = runBenchmark(100);
assert.ok(bench100.durationMs < 100, "100KB scan exceeded 100ms");

// 3. Benchmarking 1MB (large database export / log file)
const bench1000 = runBenchmark(1000);
console.log(`1MB Benchmark finished in ${bench1000.durationMs.toFixed(2)}ms`);

// 4. Memory overhead check
const memory = process.memoryUsage();
console.log(`Benchmark memory footprint: RSS=${(memory.rss / 1024 / 1024).toFixed(2)}MB | HeapUsed=${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB`);

console.log("performance.test.js passed!");
