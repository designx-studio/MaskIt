const assert = require("assert");
const fs = require("fs");
const path = require("path");
const engine = require("./engine/index");
const detector = require("./detector");
const sanitizer = require("./sanitizer");
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, "parity-fixtures.json"), "utf8"));
const defaults = require("./engine/settings").MASKIT_DEFAULTS;
let passed = 0, failed = 0;
function run(category, name, testCase) {
  try {
    const settings = { ...defaults, ...(category === "custom" ? { customRules: [testCase.rule] } : {}) };
    const engineResult = engine.scanText(testCase.input, settings);
    const expected = testCase.findings;
    assert.deepStrictEqual(engineResult.allFindings.map(f => ({ type: f.type, value: f.value })), expected);
    assert.strictEqual(engineResult.riskScore, testCase.riskScore);
    assert.strictEqual(engineResult.riskLevel, testCase.riskLevel);
    assert.deepStrictEqual(engineResult.policyDecisions.map(d => d.action), testCase.actions);
    assert.strictEqual(engineResult.redactedText, testCase.redacted_tagged);
    assert.strictEqual(engineResult.events.length, expected.length);
    assert.ok(engineResult.events.every(e => e.type && e.severity && e.source && e.action && e.policyApplied && !e.value));
    const browserFindings = detector.detectSensitiveData(testCase.input, settings);
    assert.deepStrictEqual(browserFindings.map(f => ({ type: f.type, value: f.value })), expected);
    assert.strictEqual(sanitizer.sanitizeText(testCase.input, browserFindings, { ...settings, redactFormat: "tagged" }), testCase.redacted_tagged);
    assert.strictEqual(sanitizer.sanitizeText(testCase.input, browserFindings, { ...settings, redactFormat: "stars" }), testCase.redacted_stars);
    console.log(`PASS ${category}.${name}`); passed++;
  } catch (error) { console.error(`FAIL ${category}.${name}: ${error.message}`); failed++; }
}
Object.entries(fixtures).forEach(([category, tests]) => Object.entries(tests).forEach(([name, testCase]) => run(category, name, testCase)));
console.log(`Parity: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
