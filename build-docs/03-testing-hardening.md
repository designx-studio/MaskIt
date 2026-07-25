# Document 03: Testing Hardening

## Feature Overview

Expand test coverage, install missing dependencies, and add edge case tests to reach production-grade test reliability.

## Current State

- 102 tests pass (52 engine + 32 extension + 18 MCP)
- jsdom not installed — DOM test skipped (test.js:222-224)
- No negative/edge case tests for MCP server tool handlers
- No tests for background.js badge/pause logic
- No tests for options.js save/load round-trip
- No tests for popup.js rendering

## Missing Components

1. jsdom dependency installation
2. Edge case tests for engine
3. MCP server error handling tests
4. Background script logic tests
5. Options page round-trip tests

## Files to Modify

### `package.json`

Add devDependency:
```json
{
  "devDependencies": {
    "jsdom": "^24.0.0"
  }
}
```

### `engine/test.js` — Add edge case tests

New tests to add (target: 60+ total):

```javascript
// Edge cases
test("scanText handles null input gracefully", () => {
  const result = scanText(null, allEnabled);
  assert.strictEqual(result.findings.length, 0);
  assert.strictEqual(result.riskScore, 0);
});

test("scanText handles undefined input gracefully", () => {
  const result = scanText(undefined, allEnabled);
  assert.strictEqual(result.findings.length, 0);
});

test("scanText respects maxScanLength limit", () => {
  const longText = "a".repeat(60000) + " john@test.com";
  const result = scanText(longText, allEnabled);
  // Should scan up to 50000 chars, email may or may not be found
  assert.ok(typeof result.riskScore === "number");
});

test("redactText preserves non-sensitive text", () => {
  const result = redactText("Hello world", allEnabled);
  assert.strictEqual(result.redactedText, "Hello world");
  assert.strictEqual(result.findings.length, 0);
});

test("evaluatePolicy blocks when reviewBeforeRedact is false", () => {
  const settings = Object.assign({}, allEnabled, { reviewBeforeRedact: false });
  const result = evaluatePolicy("SSN 123-45-6789", settings);
  assert.strictEqual(result.allowed, false);
});

test("evaluatePolicy allows when reviewBeforeRedact is true", () => {
  const settings = Object.assign({}, allEnabled, { reviewBeforeRedact: true });
  const result = evaluatePolicy("SSN 123-45-6789", settings);
  assert.strictEqual(result.allowed, true);
});

test("updateRules enforces maxCustomRules limit", () => {
  const manyRules = Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    name: "Rule" + i,
    pattern: "RULE" + i + "\\d{3}",
    enabled: true
  }));
  const updated = updateRules(manyRules, allEnabled);
  assert.ok(updated.customRules.length <= 15);
});

test("deduplication removes duplicate findings", () => {
  const text = "john@test.com and john@test.com";
  const result = scanText(text, allEnabled);
  const emailFindings = result.findings.filter(f => f.type === "EMAIL");
  assert.strictEqual(emailFindings.length, 1);
});

test("multiple finding types produce correct matchedRules", () => {
  const text = "Email john@test.com, SSN 123-45-6789, Card 4111111111111111";
  const result = scanText(text, allEnabled);
  assert.ok(result.matchedRules.includes("EMAIL"));
  assert.ok(result.matchedRules.includes("SSN"));
  assert.ok(result.matchedRules.includes("CARD"));
});
```

### `mcp-server/test.js` — Add error handling tests

```javascript
// Error handling
test("scanText handles empty string", () => {
  const result = engine.scanText("", config.readConfig());
  assert.strictEqual(result.findings.length, 0);
  assert.strictEqual(result.riskScore, 0);
});

test("scanText handles very long input", () => {
  const longText = "a".repeat(100000);
  const result = engine.scanText(longText, config.readConfig());
  assert.ok(typeof result.riskScore === "number");
});

test("evaluatePolicy reason is descriptive", () => {
  const result = engine.evaluatePolicy("test", config.readConfig());
  assert.ok(typeof result.reason === "string");
  assert.ok(result.reason.length > 0);
});

test("getRules returns severity for each rule", () => {
  const rules = engine.getRules(config.readConfig());
  rules.rules.forEach(rule => {
    assert.ok(rule.severity);
    assert.ok(["critical", "high", "medium", "low"].includes(rule.severity));
  });
});

test("updateRules rejects all invalid patterns", () => {
  const rules = [
    { id: "1", pattern: "(a+)+", enabled: true },
    { id: "2", pattern: "a{1,}", enabled: true },
    { id: "3", pattern: "", enabled: true }
  ];
  const updated = engine.updateRules(rules, config.readConfig());
  assert.strictEqual(updated.customRules.length, 0);
});
```

### `test.js` — Enable jsdom test

Remove the skip logic around the jsdom test (lines 222-224) since jsdom will be installed.

## Acceptance Criteria

- [ ] `npm install` installs jsdom
- [ ] DOM test no longer skipped
- [ ] Engine tests: 60+ (currently 52)
- [ ] MCP tests: 23+ (currently 18)
- [ ] All tests pass with `npm test`

## Dependencies

Doc 02 (Code Quality — ensures new tests follow standards)

## Estimated Complexity

Medium

## Production Readiness Checklist

- [ ] jsdom installed and DOM test passes
- [ ] Engine edge cases covered (null, long input, dedup)
- [ ] MCP error handling tested
- [ ] Test count meets targets