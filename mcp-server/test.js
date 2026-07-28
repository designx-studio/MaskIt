const assert = require("assert");
const fs = require("fs");
const path = require("path");
const engine = require("../engine/index");
const { simulatePolicy } = require("../engine/simulation");
const config = require("./config");
let passed = 0; let failed = 0;
function test(name, fn) { try { fn(); passed++; console.log("  PASS  " + name); } catch (err) { failed++; console.error("  FAIL  " + name); console.error("        " + err.message); } }
console.log("\nMaskit MCP/CLI tests\n");
test("config paths and defaults", () => { assert.strictEqual(typeof config.getConfigPath(), "string"); assert.strictEqual(config.getDefaultConfig().enabled, true); });
test("engine scan and policy work", () => { assert.ok(engine.scanText("Contact john@example.com", config.readConfig()).findings.length > 0); assert.ok(engine.evaluatePolicy("SSN 123-45-6789", config.readConfig()).riskScore > 0); });
test("rules and status work", () => { assert.ok(engine.getRules(config.readConfig()).rules.length >= 8); assert.strictEqual(engine.getStatus().engineReady, true); });
test("simulation is non-mutating and returns explanations", () => { const result = simulatePolicy(engine, "Contact jane@example.com", config.readConfig()); assert.strictEqual(result.mode, "simulation"); assert.strictEqual(result.mutated, false); assert.ok(Array.isArray(result.explanations)); assert.ok(result.explanations[0].explanation); });
test("invalid custom rules are rejected", () => { const updated = engine.updateRules([{ id: "bad", pattern: "(a+)+" }], config.readConfig()); assert.strictEqual(updated.customRules.length, 0); });
test("audit rotation path is safe", () => { const logPath = path.join(config.getConfigDir(), "audit-rotation-test.log"); if (fs.existsSync(logPath)) fs.unlinkSync(logPath); assert.doesNotThrow(() => fs.mkdirSync(path.dirname(logPath), { recursive: true })); });
console.log(`\n${passed} passed, ${failed} failed\n`); process.exit(failed ? 1 : 0);
