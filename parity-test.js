const assert = require("assert");
const fs = require("fs");
const path = require("path");
const engine = require("./engine/index");
const detector = require("./detector");
const sanitizer = require("./sanitizer");
const { validateContextEvent } = require("./engine/context");
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, "parity-fixtures.json"), "utf8"));
const defaults = require("./engine/settings").MASKIT_DEFAULTS;
const REQUIRED = ["schemaVersion", "eventId", "timestamp", "source", "application", "dataType", "confidence", "risk", "policy", "action", "explanation"];
let passed = 0, failed = 0;

function run(category, name, testCase) {
  try {
    const settings = {
      ...defaults,
      redactFormat: "tagged",
      ...(category === "custom" ? { customRules: [testCase.rule] } : {})
    };
    const engineResult = engine.scanText(testCase.input, { ...settings, _context: { source: "cli", app: "parity" } });
    const expected = testCase.findings;
    assert.deepStrictEqual(engineResult.allFindings.map(f => ({ type: f.type, value: f.value })), expected);
    assert.strictEqual(engineResult.riskScore, testCase.riskScore);
    assert.strictEqual(engineResult.riskLevel, testCase.riskLevel);
    assert.deepStrictEqual(engineResult.policyDecisions.map(d => d.action), testCase.actions);
    assert.strictEqual(engineResult.redactedText, testCase.redacted_tagged);
    assert.strictEqual(engineResult.events.length, expected.length);
    engineResult.events.forEach((e) => {
      REQUIRED.forEach((field) => assert.ok(Object.prototype.hasOwnProperty.call(e, field), `missing ${field}`));
      assert.ok(validateContextEvent(e).valid, `invalid event: ${validateContextEvent(e).errors.join(", ")}`);
      assert.ok(!("value" in e) && !("matchedValue" in e), "raw value must not be stored");
      assert.ok(!("unmaskToken" in e), "unmask fields must not be present");
      assert.ok(e.matchedValueHash || expected.length === 0, "matchedValueHash required");
    });
    const browserFindings = detector.detectSensitiveData(testCase.input, settings);
    assert.deepStrictEqual(browserFindings.map(f => ({ type: f.type, value: f.value })), expected, "browser/engine finding parity");
    assert.strictEqual(sanitizer.sanitizeText(testCase.input, browserFindings, { ...settings, redactFormat: "tagged" }), testCase.redacted_tagged);
    assert.strictEqual(sanitizer.sanitizeText(testCase.input, browserFindings, { ...settings, redactFormat: "stars" }), testCase.redacted_stars);
    console.log(`PASS ${category}.${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${category}.${name}: ${error.message}`);
    failed++;
  }
}

Object.entries(fixtures).forEach(([category, tests]) =>
  Object.entries(tests).forEach(([name, testCase]) => run(category, name, testCase))
);
console.log(`Parity: ${passed} passed, ${failed} failed`);
process.exitCode = failed ? 1 : 0;
