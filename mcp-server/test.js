/**
 * Maskit MCP Server — Test Suite
 * Tests tool handlers and config module.
 * Run with: node mcp-server/test.js
 */

const assert = require("assert");

const engine = require("../engine/index");
const config = require("./config");

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log("  PASS  " + name);
    } catch (err) {
        failed++;
        console.error("  FAIL  " + name);
        console.error("        " + err.message);
    }
}

console.log("\nMaskit MCP server tests\n");

// ── Config module ───────────────────────────────────────────────────────────

test("config.getConfigPath returns a string", () => {
    assert.strictEqual(typeof config.getConfigPath(), "string");
});

test("config.getDefaultConfig has expected fields", () => {
    const defaults = config.getDefaultConfig();
    assert.strictEqual(defaults.enabled, true);
    assert.ok(defaults.severity);
    assert.ok(defaults.appOverrides);
    assert.ok(defaults.appOverrides["claude-desktop"]);
});

test("config.readConfig returns defaults when no file exists", () => {
    const cfg = config.readConfig();
    assert.strictEqual(cfg.enabled, true);
    assert.ok(typeof cfg.version === "string");
});

test("config.writeConfig and readConfig round-trip", () => {
    const testConfig = config.getDefaultConfig();
    testConfig.testFlag = true;
    const writeResult = config.writeConfig(testConfig);
    assert.strictEqual(writeResult.ok, true);

    const readBack = config.readConfig();
    assert.strictEqual(readBack.testFlag, true);

    // Clean up test flag
    delete readBack.testFlag;
    config.writeConfig(readBack);
});

test("config.getSettingsForApp merges app overrides", () => {
    const settings = config.getSettingsForApp("claude-desktop");
    assert.strictEqual(settings.reviewBeforeRedact, true);
    assert.strictEqual(settings.enabled, true);
});

test("config.getSettingsForApp returns base config for unknown app", () => {
    const settings = config.getSettingsForApp("unknown-app");
    assert.strictEqual(settings.enabled, true);
});

test("config.getSettingsForApp returns base config for no app", () => {
    const settings = config.getSettingsForApp();
    assert.strictEqual(settings.enabled, true);
});

// ── Engine integration ──────────────────────────────────────────────────────

test("engine.scanText works via MCP server context", () => {
    const result = engine.scanText("Contact john@example.com", config.readConfig());
    assert.ok(result.findings.length > 0);
    assert.ok(result.redactedText.includes("[EMAIL_REDACTED]"));
});

test("engine.evaluatePolicy works via MCP server context", () => {
    const result = engine.evaluatePolicy("SSN 123-45-6789", config.readConfig());
    assert.ok(result.findings.length > 0);
    assert.ok(result.riskScore > 0);
});

test("engine.getRules works via MCP server context", () => {
    const rules = engine.getRules(config.readConfig());
    assert.ok(rules.rules.length >= 8);
    assert.ok(rules.rules.some((r) => r.type === "API_KEY"));
});

test("engine.updateRules works via MCP server context", () => {
    const newRules = [{ id: "test-1", name: "Test Rule", pattern: "TEST-\\d{4}", enabled: true }];
    const updated = engine.updateRules(newRules, config.readConfig());
    assert.strictEqual(updated.customRules.length, 1);
    assert.strictEqual(updated.customRules[0].name, "Test Rule");
});

test("engine.getStatus works via MCP server context", () => {
    const status = engine.getStatus();
    assert.strictEqual(status.engineReady, true);
    assert.ok(status.version);
});

// ── Tool handler logic (inline tests) ───────────────────────────────────────

test("scan_text handler logic returns JSON", () => {
    const settings = config.readConfig();
    const result = engine.scanText("My email is jane@test.com", settings);
    const json = JSON.stringify(result, null, 2);
    assert.ok(json.includes("findings"));
    assert.ok(json.includes("riskScore"));
    assert.ok(json.includes("redactedText"));
});

test("redact_text handler logic returns redacted text", () => {
    const settings = config.readConfig();
    settings.redactFormat = "stars";
    const result = engine.scanText("Card: 4111111111111111", settings);
    assert.ok(result.redactedText.includes("***"));
});

test("evaluate_policy handler logic returns allowed field", () => {
    const settings = config.readConfig();
    const result = engine.evaluatePolicy("Hello world", settings);
    assert.strictEqual(typeof result.allowed, "boolean");
    assert.ok(result.reason);
});

test("get_status handler logic returns version", () => {
    const status = engine.getStatus();
    assert.ok(status.version);
    assert.ok(typeof status.rulesEnabled === "number");
});

test("get_rules handler logic returns rules array", () => {
    const rules = engine.getRules(config.readConfig());
    assert.ok(Array.isArray(rules.rules));
    assert.ok(Array.isArray(rules.customRules));
});

test("update_rules handler logic filters invalid patterns", () => {
    const newRules = [
        { id: "1", name: "Valid", pattern: "ID-\\d{3}", enabled: true },
        { id: "2", name: "Bad", pattern: "(a+)+", enabled: true }
    ];
    const updated = engine.updateRules(newRules, config.readConfig());
    assert.strictEqual(updated.customRules.length, 1);
});

console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed > 0 ? 1 : 0);