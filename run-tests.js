const { run } = require("node:test");
const path = require("path");

const testFiles = [
  "test.js",
  "defaults-sync-test.js",
  "engine/test.js",
  "mcp-server/test.js",
  "parity-test.js",
  "tests/copilot/copilot-editor.test.js",
  "tests/file-upload/file-context.test.js",
  "tests/agent/configuration.test.js",
  "tests/agent/health-endpoint.test.js",
  "tests/vscode/vscode-extension.test.js",
  "tests/security/rule-regression.test.js",
  "tests/security/performance.test.js",
  "tests/security/policy-engine.test.js",
  "tests/content/content-test.js"
];

const stream = run(
  testFiles.map((file) => path.join(__dirname, file)),
  {
    concurrency: 1,
    timeout: 30000
  }
);

stream.pipe(process.stdout);
stream.on("test:fail", (data) => {
  process.exitCode = 1;
});
stream.on("end", () => {
  // Tests complete
});
