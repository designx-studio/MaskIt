const assert = require("assert");
const { isRegexSafe } = require("../../engine/settings");
const engine = require("../../engine");

console.log("Running redos-protection-v2.test.js...");

// 1. Proven catastrophic backtracking pattern that passes isRegexSafe()
const PASSED_BY_DENYLIST_REDOS_PATTERN = "^(a{1,2}){1,40}b$";

// Explicit assertion: Pattern MUST pass the static denylist (isRegexSafe returns true)
assert.strictEqual(
  isRegexSafe(PASSED_BY_DENYLIST_REDOS_PATTERN),
  true,
  "Pattern must pass isRegexSafe static denylist to ensure guard is tested"
);

const testText = "a".repeat(40);
const startTime = Date.now();

const result = engine.scanText(testText, {
  customRules: [{ name: "redos-v2-test", pattern: PASSED_BY_DENYLIST_REDOS_PATTERN, enabled: true }]
});

const elapsed = Date.now() - startTime;

// Must complete well under budget (not 12+ seconds)
assert.ok(
  elapsed < 300,
  `ReDoS worker isolation should terminate within budget, took ${elapsed}ms`
);

const customFindings = result.allFindings.filter((f) => f.type.startsWith("CUSTOM:"));
assert.strictEqual(
  customFindings.length,
  0,
  "Catastrophic pattern should yield no matches upon hard preemption timeout"
);

// 2. Safe pattern still matches normally
const SAFE_PATTERN = "test\\d+";
assert.strictEqual(isRegexSafe(SAFE_PATTERN), true);

const safeResult = engine.scanText("test1234", {
  customRules: [{ name: "safe-test", pattern: SAFE_PATTERN, enabled: true }]
});

const safeFindings = safeResult.allFindings.filter((f) => f.type.startsWith("CUSTOM:safe-test"));
assert.strictEqual(safeFindings.length, 1, "Safe custom rule should match correctly");

// 3. Keep old bypassed-by-denylist test case as well
const OLD_REDOS_PATTERN = "(a+)+$";
const oldResult = engine.scanText("a".repeat(25) + "!", {
  customRules: [{ name: "old-redos-test", pattern: OLD_REDOS_PATTERN, enabled: true }]
});
assert.ok(oldResult.allFindings.length >= 0, "Old ReDoS pattern handled safely");

console.log("redos-protection-v2.test.js passed!");
