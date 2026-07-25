const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = __dirname;

function loadScript(filename) {
  const code = fs.readFileSync(path.join(root, filename), "utf8");
  vm.runInThisContext(code, { filename });
}

loadScript("settings.js");
loadScript("detector.js");
loadScript("sanitizer.js");

const allEnabled = { ...MASKIT_DEFAULTS };

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

console.log("\nMaskit extension tests\n");

test("detects email addresses", () => {
  const findings = detectSensitiveData("Reach me at john@example.com today", allEnabled);
  assert.ok(findings.some((f) => f.type === "EMAIL"));
});

test("detects Kenyan phone numbers", () => {
  const findings = detectSensitiveData("Call +254712345678 or 0712345678", allEnabled);
  assert.ok(findings.filter((f) => f.type === "PHONE").length >= 2);
});

test("detects card numbers", () => {
  const findings = detectSensitiveData("Card: 4111 1111 1111 1111", allEnabled);
  assert.ok(findings.some((f) => f.type === "CARD"));
});

test("detects M-Pesa references", () => {
  const findings = detectSensitiveData("Ref QKA12X9L4M confirmed", allEnabled);
  assert.ok(findings.some((f) => f.type === "MPESA"));
});

test("detects SSN", () => {
  const findings = detectSensitiveData("SSN 123-45-6789", allEnabled);
  assert.ok(findings.some((f) => f.type === "SSN"));
});

test("detects OpenAI API keys", () => {
  const findings = detectSensitiveData("OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234", allEnabled);
  assert.ok(findings.some((f) => f.type === "API_KEY" && f.value.includes("sk-")));
});

test("detects Stripe secret keys", () => {
  const findings = detectSensitiveData("sk_live_abcdefghijklmnopqrstuvwxyz", allEnabled);
  assert.ok(findings.some((f) => f.type === "API_KEY"));
});

test("detects GitHub tokens", () => {
  const findings = detectSensitiveData("ghp_1234567890abcdefghijklmnopqrstuvwxyz", allEnabled);
  assert.ok(findings.some((f) => f.type === "API_KEY"));
});

test("detects AWS access keys", () => {
  const findings = detectSensitiveData("AKIAIOSFODNN7EXAMPLE", allEnabled);
  assert.ok(findings.some((f) => f.type === "API_KEY"));
});

test("detects Google API keys", () => {
  const findings = detectSensitiveData("AIzaSyAbcdefghijklmnopqrstuvwxyz1234567", allEnabled);
  assert.ok(findings.some((f) => f.type === "API_KEY"));
});

test("detects Bearer tokens", () => {
  const findings = detectSensitiveData("Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI", allEnabled);
  assert.ok(findings.some((f) => f.type === "API_KEY"));
});

test("detects api_key assignment patterns", () => {
  const findings = detectSensitiveData('api_key = "supersecretkey123456789"', allEnabled);
  assert.ok(findings.some((f) => f.type === "API_KEY"));
});

test("ignores version numbers as IP addresses", () => {
  const findings = detectSensitiveData("Updated to version 1.2.3.4 today", allEnabled);
  assert.strictEqual(findings.filter((f) => f.type === "IP_ADDRESS").length, 0);
});

test("rejects unsafe custom regex patterns", () => {
  assert.strictEqual(validateCustomRegexPattern("(a+)+").ok, false);
  assert.strictEqual(validateCustomRegexPattern("a{1,}").ok, false);
  assert.ok(validateCustomRegexPattern("EMP-\\d{5}").ok);
});

test("ignores all-letter strings as M-Pesa codes", () => {
  const findings = detectSensitiveData("CONNECTION reset", allEnabled);
  assert.strictEqual(findings.filter((f) => f.type === "MPESA").length, 0);
});

test("ignores invalid card numbers failing Luhn", () => {
  const findings = detectSensitiveData("Card 4111 1111 1111 1112", allEnabled);
  assert.strictEqual(findings.filter((f) => f.type === "CARD").length, 0);
});

test("detects IP addresses", () => {
  const findings = detectSensitiveData("Server 192.168.1.1 online", allEnabled);
  assert.ok(findings.some((f) => f.type === "IP_ADDRESS"));
});

test("detects passport numbers", () => {
  const findings = detectSensitiveData("Passport AB1234567", allEnabled);
  assert.ok(findings.some((f) => f.type === "PASSPORT"));
});

test("detects IBAN bank accounts", () => {
  const findings = detectSensitiveData("IBAN GB82WEST12345698765432", allEnabled);
  assert.ok(findings.some((f) => f.type === "BANK_ACCOUNT"));
});

test("detects custom rules", () => {
  const settings = {
    ...allEnabled,
    customRules: [{ id: "1", name: "Employee ID", pattern: "EMP-\\d{5}", enabled: true }]
  };
  const findings = detectSensitiveData("User EMP-12345 logged in", settings);
  assert.ok(findings.some((f) => f.type === "CUSTOM:Employee ID"));
});

test("site allowlist blocks unknown hosts", () => {
  const settings = { ...allEnabled, siteListMode: "allowlist", siteList: ["chatgpt.com"] };
  assert.strictEqual(isSiteAllowed(settings, "google.com"), false);
  assert.strictEqual(isSiteAllowed(settings, "chatgpt.com"), true);
});

test("site blocklist excludes hosts", () => {
  const settings = { ...allEnabled, siteListMode: "blocklist", siteList: ["mail.google.com"] };
  assert.strictEqual(isSiteAllowed(settings, "mail.google.com"), false);
  assert.strictEqual(isSiteAllowed(settings, "chatgpt.com"), true);
});

test("sanitizes with tagged format", () => {
  const text = "Email john@example.com";
  const findings = detectSensitiveData(text, allEnabled);
  const result = sanitizeText(text, findings, { redactFormat: "tagged" });
  assert.ok(result.includes("[EMAIL_REDACTED]"));
});

test("sanitizes with stars format", () => {
  const text = "Email john@example.com";
  const findings = detectSensitiveData(text, allEnabled);
  const result = sanitizeText(text, findings, { redactFormat: "stars" });
  assert.strictEqual(result, "Email ***");
});

test("sanitizes with custom format", () => {
  const text = "Email john@example.com";
  const findings = detectSensitiveData(text, allEnabled);
  const result = sanitizeText(text, findings, {
    redactFormat: "custom",
    customRedactText: "HIDDEN"
  });
  assert.strictEqual(result, "Email HIDDEN");
});

test("manifest.json is valid", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
  assert.strictEqual(manifest.manifest_version, 3);
  assert.ok(manifest.host_permissions.includes("https://chatgpt.com/*"));
  assert.ok(!manifest.host_permissions.includes("https://*/*"));
  assert.ok(manifest.background?.service_worker);
  assert.ok(manifest.action?.default_popup);
  assert.ok(manifest.commands?.["toggle-protection"]);
  for (const file of manifest.content_scripts[0].js) {
    assert.ok(fs.existsSync(path.join(root, file)), `missing script: ${file}`);
  }
  assert.ok(fs.existsSync(path.join(root, "popup.html")));
  assert.ok(fs.existsSync(path.join(root, "editors.js")));
  assert.ok(fs.existsSync(path.join(root, "privacy-policy.html")));
  assert.ok(fs.existsSync(path.join(root, "scripts/build.js")));
});

test("detects email after slow word-by-word typing", () => {
  let text = "";
  const chunks = ["john", "@", "example", ".", "com"];

  chunks.forEach((chunk) => {
    text += chunk;
    const findings = detectSensitiveData(text, allEnabled);
    if (chunk !== "com") {
      assert.strictEqual(findings.length, 0, `should not detect before email is complete (${text})`);
    }
  });

  const findings = detectSensitiveData(text, allEnabled);
  assert.ok(findings.some((f) => f.type === "EMAIL"));
  assert.ok(sanitizeText(text, findings, allEnabled).includes("[EMAIL_REDACTED]"));
});

test("detects email when followed by a space between words", () => {
  const text = "my email is john@example.com and more";
  const findings = detectSensitiveData(text, allEnabled);
  assert.ok(findings.some((f) => f.type === "EMAIL"));
});

test("inserts sanitized text into textarea (paste simulation)", () => {
  let JSDOM;
  try {
    ({ JSDOM } = require("jsdom"));
  } catch {
    console.log("        (skipped — run npm install jsdom for DOM test)");
    return;
  }

  const dom = new JSDOM("<!DOCTYPE html><html><body><textarea></textarea></body></html>");
  const textarea = dom.window.document.querySelector("textarea");
  const pasted = "Contact john@example.com";
  const findings = detectSensitiveData(pasted, allEnabled);
  const sanitized = sanitizeText(pasted, findings, allEnabled);

  textarea.setRangeText(sanitized, 0, 0, "end");
  assert.strictEqual(textarea.value, "Contact [EMAIL_REDACTED]");
});

// ── Shared engine integration tests ──────────────────────────────────────

test("shared engine scanText works from root", () => {
  const engine = require("./engine/index");
  const result = engine.scanText("Contact john@example.com", allEnabled);
  assert.ok(result.findings.some((f) => f.type === "EMAIL"));
  assert.ok(result.redactedText.includes("[EMAIL_REDACTED]"));
  assert.ok(typeof result.riskScore === "number");
  assert.ok(typeof result.riskLevel === "string");
});

test("shared engine detects cloud keys", () => {
  const engine = require("./engine/index");
  const result = engine.scanText("Token: ya29.a0AfH6SMBxyz1234567890abcdefghijklmnop", allEnabled);
  assert.ok(result.findings.some((f) => f.type === "API_KEY"));
});

test("shared engine evaluatePolicy works", () => {
  const engine = require("./engine/index");
  const result = engine.evaluatePolicy("SSN 123-45-6789", allEnabled);
  assert.ok(result.findings.length > 0);
  assert.ok(result.riskScore > 0);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
