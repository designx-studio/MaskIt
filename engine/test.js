/**
 * Maskit Shared Engine — Test Suite
 * Run with: node engine/test.js
 */

const assert = require("assert");

const {
    scanText,
    redactText,
    detectSensitiveData,
    sanitizeText,
    calculateRiskScore,
    getRiskLevel,
    evaluatePolicy,
    getRules,
    updateRules,
    getStatus,
    validateFinding,
    luhnCheck,
    MASKIT_DEFAULTS,
    SEVERITY_DEFAULTS,
    SEVERITY_WEIGHTS,
    REGEX_LIMITS,
    validateCustomRegexPattern,
    isSiteAllowed,
    maskPreview,
    hostnameMatches
} = require("./index");

const allEnabled = Object.assign({}, MASKIT_DEFAULTS);

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

console.log("\nMaskit shared engine tests\n");

// ── Core detection ──────────────────────────────────────────────────────────

test("detects email addresses", () => {
    const result = scanText("Reach me at john@example.com today", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "EMAIL"));
    assert.ok(result.redactedText.includes("[EMAIL_REDACTED]"));
});

test("detects Kenyan phone numbers", () => {
    const result = scanText("Call +254712345678 or 0712345678", allEnabled);
    assert.ok(result.findings.filter((f) => f.type === "PHONE").length >= 2);
});

test("detects card numbers", () => {
    const result = scanText("Card: 4111 1111 1111 1111", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "CARD"));
});

test("detects M-Pesa references", () => {
    const result = scanText("Ref QKA12X9L4M confirmed", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "MPESA"));
});

test("detects SSN", () => {
    const result = scanText("SSN 123-45-6789", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "SSN"));
});

test("detects IP addresses", () => {
    const result = scanText("Server 192.168.1.1 online", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "IP_ADDRESS"));
});

test("detects passport numbers", () => {
    const result = scanText("Passport AB1234567", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "PASSPORT"));
});

test("detects IBAN bank accounts", () => {
    const result = scanText("IBAN GB82WEST12345698765432", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "BANK_ACCOUNT"));
});

// ── API key detection ───────────────────────────────────────────────────────

test("detects OpenAI API keys", () => {
    const result = scanText('OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234', allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY" && f.value.includes("sk-")));
});

test("detects Stripe secret keys", () => {
    const result = scanText("sk_live_abcdefghijklmnopqrstuvwxyz", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY"));
});

test("detects GitHub tokens", () => {
    const result = scanText("ghp_1234567890abcdefghijklmnopqrstuvwxyz", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY"));
});

test("detects AWS access keys", () => {
    const result = scanText("AKIAIOSFODNN7EXAMPLE", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY"));
});

test("detects Google API keys", () => {
    const result = scanText("AIzaSyAbcdefghijklmnopqrstuvwxyz1234567", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY"));
});

test("detects Bearer tokens", () => {
    const result = scanText("Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY"));
});

test("detects api_key assignment patterns", () => {
    const result = scanText('api_key = "supersecretkey123456789"', allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY"));
});

// ── Expanded cloud key detection ────────────────────────────────────────────

test("detects GCP OAuth tokens", () => {
    const result = scanText("Token: ya29.a0AfH6SMBxyz1234567890abcdefghijklmnop", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY" && f.value.includes("ya29.")));
});

test("detects Azure connection strings", () => {
    const key = "abcdefghijklmnopqrstuvwxyz1234567890+/ABCDEFGHIJKLMNOPQRSTUVWXYZab==";
    const result = scanText("DefaultEndpointsProtocol=https;AccountName=myacct;AccountKey=" + key + ";", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY"));
});

test("detects DigitalOcean tokens", () => {
    const result = scanText("do_token_abc12345678901234567890", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY" && f.value.includes("do_token_")));
});

test("detects SendGrid API keys", () => {
    const result = scanText("SG.abcdefghijklmnopqrstuv.ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY" && f.value.startsWith("SG.")));
});

test("detects Cloudflare API tokens", () => {
    const result = scanText("CF_API_TOKEN_abcdefghijklmnopqrstuvwxyz1234", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY" && f.value.includes("CF_")));
});

test("detects Auth0 tokens", () => {
    const result = scanText("token: auth0|abcdefghijklmnopqrstuvwxyz", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY" && f.value.includes("auth0|")));
});

test("detects Terraform tokens", () => {
    const result = scanText("TF_TOKEN_abcdefghijklmnopqrstuvwxyz", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY" && f.value.includes("TF_TOKEN_")));
});

test("detects Docker Hub tokens", () => {
    const result = scanText("dckr_pat_abcdefghijklmnopqrstuvwxyz1234", allEnabled);
    assert.ok(result.findings.some((f) => f.type === "API_KEY" && f.value.includes("dckr_pat_")));
});

// ── Custom rules ────────────────────────────────────────────────────────────

test("detects custom rules", () => {
    const settings = Object.assign({}, allEnabled, {
        customRules: [{ id: "1", name: "Employee ID", pattern: "EMP-\\d{5}", enabled: true }]
    });
    const result = scanText("User EMP-12345 logged in", settings);
    assert.ok(result.findings.some((f) => f.type === "CUSTOM:Employee ID"));
});

// ── False positive guards ───────────────────────────────────────────────────

test("ignores version numbers as IP addresses", () => {
    const result = scanText("Updated to version 1.2.3.4 today", allEnabled);
    assert.strictEqual(result.findings.filter((f) => f.type === "IP_ADDRESS").length, 0);
});

test("ignores all-letter strings as M-Pesa codes", () => {
    const result = scanText("CONNECTION reset", allEnabled);
    assert.strictEqual(result.findings.filter((f) => f.type === "MPESA").length, 0);
});

test("ignores invalid card numbers failing Luhn", () => {
    const result = scanText("Card 4111 1111 1111 1112", allEnabled);
    assert.strictEqual(result.findings.filter((f) => f.type === "CARD").length, 0);
});

test("rejects unsafe custom regex patterns", () => {
    assert.strictEqual(validateCustomRegexPattern("(a+)+").ok, false);
    assert.strictEqual(validateCustomRegexPattern("a{1,}").ok, false);
    assert.ok(validateCustomRegexPattern("EMP-\\d{5}").ok);
});

// ── Risk scoring ────────────────────────────────────────────────────────────

test("risk score is 0 for clean text", () => {
    const result = scanText("Hello, this is safe text", allEnabled);
    assert.strictEqual(result.riskScore, 0);
    assert.strictEqual(result.riskLevel, "low");
});

test("risk score increases with severity", () => {
    const emailResult = scanText("john@example.com", allEnabled);
    const ssnResult = scanText("123-45-6789", allEnabled);
    assert.ok(ssnResult.riskScore > emailResult.riskScore, "SSN should score higher than email");
});

test("risk level thresholds work correctly", () => {
    assert.strictEqual(getRiskLevel(0), "low");
    assert.strictEqual(getRiskLevel(5), "low");
    assert.strictEqual(getRiskLevel(10), "medium");
    assert.strictEqual(getRiskLevel(24), "medium");
    assert.strictEqual(getRiskLevel(25), "high");
    assert.strictEqual(getRiskLevel(49), "high");
    assert.strictEqual(getRiskLevel(50), "critical");
    assert.strictEqual(getRiskLevel(100), "critical");
});

test("risk score caps at 100", () => {
    const longText = "email: john@test.com, ssn: 123-45-6789, card: 4111111111111111, api: sk-abcdefghijklmnopqrstuvwx";
    const result = scanText(longText, allEnabled);
    assert.ok(result.riskScore <= 100, "Risk score should not exceed 100");
});

test("scanText returns matchedRules", () => {
    const result = scanText("john@example.com and 123-45-6789", allEnabled);
    assert.ok(result.matchedRules.includes("EMAIL"));
    assert.ok(result.matchedRules.includes("SSN"));
});

// ── Severity levels ─────────────────────────────────────────────────────────

test("findings include severity field", () => {
    const result = scanText("john@example.com", allEnabled);
    assert.ok(result.findings.length > 0);
    assert.ok(result.findings[0].severity);
    assert.ok(result.findings[0].ruleName);
});

test("severity defaults are defined for all types", () => {
    assert.strictEqual(typeof SEVERITY_DEFAULTS.EMAIL, "string");
    assert.strictEqual(typeof SEVERITY_DEFAULTS.API_KEY, "string");
    assert.strictEqual(typeof SEVERITY_DEFAULTS.CARD, "string");
    assert.strictEqual(typeof SEVERITY_DEFAULTS.SSN, "string");
    assert.strictEqual(typeof SEVERITY_DEFAULTS.BANK_ACCOUNT, "string");
    assert.strictEqual(typeof SEVERITY_DEFAULTS.PASSPORT, "string");
    assert.strictEqual(typeof SEVERITY_DEFAULTS.IP_ADDRESS, "string");
    assert.strictEqual(typeof SEVERITY_DEFAULTS.PHONE, "string");
    assert.strictEqual(typeof SEVERITY_DEFAULTS.MPESA, "string");
});

test("severity weights are defined", () => {
    assert.strictEqual(SEVERITY_WEIGHTS.critical, 50);
    assert.strictEqual(SEVERITY_WEIGHTS.high, 25);
    assert.strictEqual(SEVERITY_WEIGHTS.medium, 10);
    assert.strictEqual(SEVERITY_WEIGHTS.low, 5);
});

// ── Redaction formats ───────────────────────────────────────────────────────

test("sanitizes with tagged format", () => {
    const result = redactText("Email john@example.com", { redactFormat: "tagged" });
    assert.ok(result.redactedText.includes("[EMAIL_REDACTED]"));
});

test("sanitizes with stars format", () => {
    const result = redactText("Email john@example.com", { redactFormat: "stars" });
    assert.strictEqual(result.redactedText, "Email ***");
});

test("sanitizes with custom format", () => {
    const result = redactText("Email john@example.com", { redactFormat: "custom", customRedactText: "HIDDEN" });
    assert.strictEqual(result.redactedText, "Email HIDDEN");
});

// ── Evaluate policy ─────────────────────────────────────────────────────────

test("evaluatePolicy returns allowed for clean text", () => {
    const result = evaluatePolicy("Hello world", allEnabled);
    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.riskScore, 0);
});

test("evaluatePolicy flags sensitive text", () => {
    const result = evaluatePolicy("SSN 123-45-6789", allEnabled);
    assert.ok(result.findings.length > 0);
    assert.ok(result.riskScore > 0);
    assert.ok(result.reason.includes("sensitive"));
});

// ── Get rules ───────────────────────────────────────────────────────────────

test("getRules returns all built-in rules", () => {
    const rules = getRules(allEnabled);
    assert.ok(rules.rules.length >= 8, "Should have at least 8 built-in rules");
    assert.ok(rules.rules.some((r) => r.type === "EMAIL"));
    assert.ok(rules.rules.some((r) => r.type === "API_KEY"));
});

test("getRules includes custom rules", () => {
    const settings = Object.assign({}, allEnabled, {
        customRules: [{ id: "1", name: "Test", pattern: "TEST-\\d+", enabled: true }]
    });
    const rules = getRules(settings);
    assert.ok(rules.customRules.length === 1);
    assert.strictEqual(rules.customRules[0].name, "Test");
});

// ── Update rules ────────────────────────────────────────────────────────────

test("updateRules filters invalid patterns", () => {
    const newRules = [
        { id: "1", name: "Valid", pattern: "EMP-\\d{5}", enabled: true },
        { id: "2", name: "Invalid", pattern: "(a+)+", enabled: true },
        { id: "3", name: "Empty", pattern: "", enabled: true }
    ];
    const updated = updateRules(newRules, allEnabled);
    assert.strictEqual(updated.customRules.length, 1);
    assert.strictEqual(updated.customRules[0].name, "Valid");
});

// ── Get status ──────────────────────────────────────────────────────────────

test("getStatus returns engine info", () => {
    const status = getStatus();
    assert.strictEqual(status.engineReady, true);
    assert.ok(typeof status.version === "string");
    assert.ok(status.rulesEnabled > 0);
});

// ── Helpers ─────────────────────────────────────────────────────────────────

test("maskPreview shows masked string", () => {
    assert.strictEqual(maskPreview("john@example.com"), "jo***om");
    assert.strictEqual(maskPreview("hi"), "***");
});

test("hostnameMatches works with wildcards", () => {
    assert.ok(hostnameMatches("chat.example.com", "*.example.com"));
    assert.ok(hostnameMatches("example.com", "example.com"));
    assert.ok(!hostnameMatches("other.com", "example.com"));
});

test("site allowlist blocks unknown hosts", () => {
    const settings = Object.assign({}, allEnabled, { siteListMode: "allowlist", siteList: ["chatgpt.com"] });
    assert.strictEqual(isSiteAllowed(settings, "google.com"), false);
    assert.strictEqual(isSiteAllowed(settings, "chatgpt.com"), true);
});

test("site blocklist excludes hosts", () => {
    const settings = Object.assign({}, allEnabled, { siteListMode: "blocklist", siteList: ["mail.google.com"] });
    assert.strictEqual(isSiteAllowed(settings, "mail.google.com"), false);
    assert.strictEqual(isSiteAllowed(settings, "chatgpt.com"), true);
});

// ── Scan text summary ───────────────────────────────────────────────────────

test("scanText returns complete result object", () => {
    const result = scanText("Contact john@example.com", allEnabled);
    assert.ok(typeof result.findings === "object");
    assert.ok(typeof result.redactedText === "string");
    assert.ok(typeof result.riskScore === "number");
    assert.ok(typeof result.riskLevel === "string");
    assert.ok(typeof result.matchedRules === "object");
});

test("empty text returns no findings", () => {
    const result = scanText("", allEnabled);
    assert.strictEqual(result.findings.length, 0);
    assert.strictEqual(result.riskScore, 0);
    assert.strictEqual(result.riskLevel, "low");
});

test("disabled rules are not detected", () => {
    const settings = Object.assign({}, allEnabled, { EMAIL: false });
    const result = scanText("john@example.com", settings);
    assert.strictEqual(result.findings.filter((f) => f.type === "EMAIL").length, 0);
});

console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed > 0 ? 1 : 0);