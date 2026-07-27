const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const engine = require("./engine/index");

const fixtures = JSON.parse(fs.readFileSync("parity-fixtures.json", "utf8"));
const browser = { console, RegExp, String, Object, Array, Set, Math, Date };
vm.createContext(browser);
vm.runInContext(fs.readFileSync("settings.js", "utf8"), browser);
vm.runInContext(fs.readFileSync("detector.js", "utf8"), browser);
vm.runInContext(fs.readFileSync("sanitizer.js", "utf8"), browser);
const browserDefaults = vm.runInContext("MASKIT_DEFAULTS", browser);

for (const fixture of fixtures) {
  const settings = { ...browserDefaults, redactFormat: fixture.format, customRules: fixture.customRules || [] };
  const browserFindings = browser.detectSensitiveData(fixture.text, settings).map((f) => f.type);
  const nodeResult = engine.scanText(fixture.text, { ...settings, _context: { app: "claude.ai", source: "parity" } });
  for (const type of fixture.types) {
    assert.ok(browserFindings.includes(type), `${fixture.name}: browser missing ${type}`);
    assert.ok(nodeResult.allFindings.some((f) => f.type === type), `${fixture.name}: core missing ${type}`);
  }
  assert.strictEqual(browserFindings.length, nodeResult.allFindings.length, `${fixture.name}: finding count drift`);
  const browserRedacted = browser.sanitizeText(fixture.text, browser.detectSensitiveData(fixture.text, settings), settings);
  assert.strictEqual(nodeResult.redactedText, browserRedacted, `${fixture.name}: redaction drift`);
  if (fixture.blocked) assert.ok(nodeResult.policyDecisions.some((d) => d.action === "block"), `${fixture.name}: policy drift`);
}
console.log(`Parity fixtures passed: ${fixtures.length}`);
