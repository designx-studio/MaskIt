const assert = require("assert");
const fs = require("fs");
const path = require("path");
const engine = require("./engine/index");
const detector = require("./detector");
const sanitizer = require("./sanitizer");

const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, "parity-fixtures.json"), "utf8"));
const MASKIT_DEFAULTS = require("./engine/settings").MASKIT_DEFAULTS;

let passed = 0;
let failed = 0;

function runParityTest(category, name, testCase) {
  try {
    // 1. Test engine output
    const settings = { ...MASKIT_DEFAULTS };
    if (category === "custom") {
      settings.customRules = [testCase.rule];
    }
    
    const engineResult = engine.scanText(testCase.input, settings);
    assert.deepStrictEqual(
      engineResult.allFindings.map(f => ({ type: f.type, value: f.value })), 
      testCase.findings, 
      `Engine mismatch for ${category}.${name}`
    );

    // 2. Test browser detector output
    const browserFindings = detector.detectSensitiveData(testCase.input, settings);
    assert.deepStrictEqual(
      browserFindings.map(f => ({ type: f.type, value: f.value })),
      testCase.findings,
      `Browser detector mismatch for ${category}.${name}`
    );
    
    // 3. Test sanitizer outputs
    const taggedResult = sanitizer.sanitizeText(testCase.input, browserFindings, { ...settings, redactFormat: "tagged" });
    assert.strictEqual(taggedResult, testCase.redacted_tagged, `Tagged redaction mismatch for ${category}.${name}`);
    
    const starsResult = sanitizer.sanitizeText(testCase.input, browserFindings, { ...settings, redactFormat: "stars" });
    assert.strictEqual(starsResult, testCase.redacted_stars, `Stars redaction mismatch for ${category}.${name}`);

    console.log(`  PASS  ${category}.${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${category}.${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log("\nRunning Cross-Platform Parity Tests\n");

Object.entries(fixtures).forEach(([category, tests]) => {
  Object.entries(tests).forEach(([name, testCase]) => {
    runParityTest(category, name, testCase);
  });
});

console.log(`\nParity Tests: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);