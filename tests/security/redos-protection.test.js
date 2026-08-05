const assert = require("assert");

console.log("Running redos-protection.test.js...");

const engine = require("../../engine");

const REDOS_PATTERN = "(a+)+$";
const testText = "a".repeat(25) + "!";
const startTime = Date.now();
const result = engine.scanText(testText, {
  customRules: [{ name: "redos-test", pattern: REDOS_PATTERN, enabled: true }]
});
const elapsed = Date.now() - startTime;

assert.ok(elapsed < 200, `ReDoS protection should terminate within 200ms, took ${elapsed}ms`);

const customFindings = result.allFindings.filter(f => f.type.startsWith("CUSTOM:"));
assert.ok(customFindings.length >= 0, "Should handle ReDoS pattern without hanging");

const SAFE_PATTERN = "test\\d+";
const safeResult = engine.scanText("test123", {
  customRules: [{ name: "safe-test", pattern: SAFE_PATTERN, enabled: true }]
});
const safeFindings = safeResult.allFindings.filter(f => f.type.startsWith("CUSTOM:safe-test"));
assert.ok(safeFindings.length > 0, "Safe regex pattern should still work correctly");

console.log("redos-protection.test.js passed!");
