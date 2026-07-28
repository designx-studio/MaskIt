const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadBrowserCore() {
  const context = {
    console, RegExp, String, Object, Array, Set, Math, Date, Number, Boolean, JSON, Error,
    parseInt, parseFloat, isNaN, Infinity, undefined
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "settings.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "browser-rules.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "context-event.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "detector.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "sanitizer.js"), "utf8"), context);
  return context;
}

const browser = loadBrowserCore();
const defaults = browser.MASKIT_DEFAULTS || vm.runInContext("MASKIT_DEFAULTS", browser);
const findings = browser.detectSensitiveData("Email john@example.com, phone +254712345678, SSN 123-45-6789", defaults);
assert.ok(findings.some((f) => f.type === "EMAIL"));
assert.ok(findings.some((f) => f.type === "PHONE"));
assert.ok(findings.some((f) => f.type === "SSN"));
const sanitizedEmail = browser.sanitizeText("Email john@example.com", browser.detectSensitiveData("Email john@example.com", defaults), defaults);
assert.ok(sanitizedEmail.includes("REDACTED") || sanitizedEmail.includes("***"), "expected redaction markers");

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8"));
assert.strictEqual(manifest.manifest_version, 3);
assert.ok(!JSON.stringify(manifest).toLowerCase().includes("gmail"));
assert.ok(manifest.content_scripts[0].matches.every((match) => match !== "<all_urls>"));
assert.ok(manifest.content_scripts[0].matches.includes("https://claude.ai/*"));
assert.ok(manifest.content_scripts[0].js.includes("content.js"));
assert.ok(manifest.content_scripts[0].js.includes("browser-rules.js"));
assert.ok(manifest.content_scripts[0].js.includes("context-event.js"));
assert.ok(manifest.background.service_worker === "background.js");
assert.ok(!fs.readFileSync(path.join(__dirname, "content.js"), "utf8").includes("showUnmaskButton"));
assert.ok(!fs.readFileSync(path.join(__dirname, "background.js"), "utf8").includes("UNMASK_VALUE"));

const engine = require("./engine/index");
const result = engine.scanText("API key sk-proj-abcdefghijklmnopqrstuvwxyz1234", { _context: { app: "claude.ai", source: "test" } });
assert.ok(result.allFindings.some((f) => f.type === "API_KEY"));
assert.ok(result.redactedText.includes("REDACTED") || result.redactedText.includes("***"));

console.log("Maskit browser and AI scope tests passed");
