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
    hostnameMatches,
    createAuditEvent,
    hashSensitive,
    pruneAuditLog,
    selectPolicy,
    getPolicyAction,
    AUDIT_LOG_DEFAULTS,
    MASKIT_POLICY_DEFAULTS,
    KILLSWITCH_DEFAULTS,
    isAIToolsAllowed,
    parseTime,
    isUserExempt
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
    assert.ok(result.redactedText.includes("***"));
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

// ── Phase 2: Audit Log ────────────────────────────────────────────────────

test("createAuditEvent returns structured event", () => {
    const evt = createAuditEvent({
        type: "EMAIL",
        severity: "medium",
        source: "paste",
        app: "chatgpt.com",
        action: "redacted",
        riskScore: 10,
        matchedRule: "EMAIL",
        policyApplied: "default",
        value: "john@example.com"
    });
    assert.ok(evt.id.startsWith("evt_"));
    assert.strictEqual(evt.type, "EMAIL");
    assert.strictEqual(evt.severity, "medium");
    assert.strictEqual(evt.source, "paste");
    assert.strictEqual(evt.app, "chatgpt.com");
    assert.strictEqual(evt.action, "redacted");
    assert.strictEqual(evt.riskScore, 10);
    assert.ok(typeof evt.timestamp === "number");
    assert.ok(evt.unmaskToken !== null);
    assert.strictEqual(evt.unmaskedAt, null);
});

test("createAuditEvent defaults for missing fields", () => {
    const evt = createAuditEvent({});
    assert.strictEqual(evt.type, "UNKNOWN");
    assert.strictEqual(evt.severity, "medium");
    assert.strictEqual(evt.source, "unknown");
    assert.strictEqual(evt.action, "redacted");
});

test("hashSensitive produces deterministic tokens", () => {
    const hash1 = hashSensitive("sk-abc123secret");
    const hash2 = hashSensitive("sk-abc123secret");
    const hash3 = hashSensitive("sk-different-key");
    assert.strictEqual(hash1, hash2, "Same input should produce same hash");
    assert.notStrictEqual(hash1, hash3, "Different input should produce different hash");
    assert.ok(hash1.length === 16, "Hash should be 16 hex chars");
});

test("pruneAuditLog removes old events", () => {
    const oldEvent = { timestamp: Date.now() - 40 * 24 * 60 * 60 * 1000, type: "EMAIL" };
    const newEvent = { timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000, type: "API_KEY" };
    const pruned = pruneAuditLog([oldEvent, newEvent], 30);
    assert.strictEqual(pruned.length, 1);
    assert.strictEqual(pruned[0].type, "API_KEY");
});

test("pruneAuditLog keeps all events within retention", () => {
    const events = [
        { timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, type: "EMAIL" },
        { timestamp: Date.now() - 20 * 24 * 60 * 60 * 1000, type: "API_KEY" }
    ];
    const pruned = pruneAuditLog(events, 30);
    assert.strictEqual(pruned.length, 2);
});

test("scanText returns events array", () => {
    const result = scanText("john@example.com", allEnabled);
    assert.ok(Array.isArray(result.events));
    assert.ok(result.events.length > 0);
    assert.ok(result.events[0].id);
    assert.ok(result.events[0].timestamp);
    assert.strictEqual(result.events[0].type, "EMAIL");
});

test("scanText returns policyDecisions", () => {
    const result = scanText("john@example.com", allEnabled);
    assert.ok(Array.isArray(result.policyDecisions));
    assert.ok(result.policyDecisions.length > 0);
    assert.ok(result.policyDecisions[0].finding);
    assert.ok(result.policyDecisions[0].action);
});

// ── Phase 2: Role-Based Policies ──────────────────────────────────────────

test("selectPolicy returns default policy", () => {
    const policy = selectPolicy({}, allEnabled);
    assert.ok(policy.EMAIL);
    assert.strictEqual(policy.EMAIL.action, "redact");
});

test("selectPolicy returns app-specific policy", () => {
    const settings = Object.assign({}, allEnabled, {
        policies: {
            "default": { EMAIL: { action: "redact" } },
            "chatgpt.com": { EMAIL: { action: "block" } }
        }
    });
    const policy = selectPolicy({ app: "chatgpt.com" }, settings);
    assert.strictEqual(policy.EMAIL.action, "block");
});

test("selectPolicy falls back to default for unknown app", () => {
    const settings = Object.assign({}, allEnabled, {
        policies: {
            "default": { EMAIL: { action: "redact" } },
            "chatgpt.com": { EMAIL: { action: "block" } }
        }
    });
    const policy = selectPolicy({ app: "unknown-app" }, settings);
    assert.strictEqual(policy.EMAIL.action, "redact");
});

test("getPolicyAction returns correct action", () => {
    const policy = { EMAIL: { action: "allow" }, API_KEY: { action: "block" } };
    assert.strictEqual(getPolicyAction(policy, "EMAIL"), "allow");
    assert.strictEqual(getPolicyAction(policy, "API_KEY"), "block");
    assert.strictEqual(getPolicyAction(policy, "SSN"), "redact"); // default
});

test("scanText with allow policy skips redaction", () => {
    const settings = Object.assign({}, allEnabled, {
        policies: {
            "default": { EMAIL: { action: "allow" } }
        }
    });
    const result = scanText("john@example.com", settings);
    // findings should be empty since EMAIL is allowed
    assert.strictEqual(result.findings.length, 0);
    // but allFindings should still have the detection
    assert.ok(result.allFindings.length > 0);
    // redactedText should be unchanged
    assert.ok(result.redactedText.includes("john@example.com"));
});

test("scanText with block policy blocks item", () => {
    const settings = Object.assign({}, allEnabled, {
        policies: {
            "default": { EMAIL: { action: "block" } }
        }
    });
    const result = scanText("john@example.com", settings);
    // Block means the finding is still shown (actionable)
    assert.ok(result.findings.length > 0);
    // Policy decision should be block
    assert.ok(result.policyDecisions.some(function (d) { return d.action === "block"; }));
});

test("evaluatePolicy returns policy breakdown", () => {
    const result = evaluatePolicy("john@example.com and 123-45-6789", allEnabled);
    assert.ok(typeof result.blocked === "number");
    assert.ok(typeof result.redacted === "number");
    assert.ok(typeof result.allowedByPolicy === "number");
    assert.ok(typeof result.allFindings === "object");
});

test("evaluatePolicy with mixed policies", () => {
    const settings = Object.assign({}, allEnabled, {
        policies: {
            "default": {
                EMAIL: { action: "allow" },
                SSN: { action: "block" }
            }
        }
    });
    const result = evaluatePolicy("john@example.com and 123-45-6789", settings);
    assert.strictEqual(result.allowedByPolicy, 1); // EMAIL allowed
    assert.strictEqual(result.blocked, 1); // SSN blocked
});

// ── Phase 2: Policy defaults ──────────────────────────────────────────────

test("MASKIT_POLICY_DEFAULTS has default policy", () => {
    assert.ok(MASKIT_POLICY_DEFAULTS.policies["default"]);
    assert.strictEqual(MASKIT_POLICY_DEFAULTS.activePolicy, "default");
});

test("AUDIT_LOG_DEFAULTS has expected fields", () => {
    assert.ok(Array.isArray(AUDIT_LOG_DEFAULTS.events));
    assert.strictEqual(AUDIT_LOG_DEFAULTS.retentionDays, 30);
});

// ── Phase 5: Killswitch ──────────────────────────────────────────────────

test("KILLSWITCH_DEFAULTS has expected structure", () => {
    assert.strictEqual(KILLSWITCH_DEFAULTS.enabled, false);
    assert.ok(typeof KILLSWITCH_DEFAULTS.message === "string");
    assert.strictEqual(KILLSWITCH_DEFAULTS.duration, null);
    assert.ok(Array.isArray(KILLSWITCH_DEFAULTS.exemptions));
    assert.strictEqual(KILLSWITCH_DEFAULTS.schedule, null);
});

test("isAIToolsAllowed returns allowed when killswitch disabled", () => {
    const result = isAIToolsAllowed({ enabled: false });
    assert.strictEqual(result.allowed, true);
});

test("isAIToolsAllowed blocks indefinite killswitch", () => {
    const result = isAIToolsAllowed({ enabled: true, message: "Blocked by admin" });
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason.includes("Blocked by admin"));
});

test("isAIToolsAllowed blocks time-limited killswitch before expiry", () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    const result = isAIToolsAllowed({ enabled: true, duration: futureDate });
    assert.strictEqual(result.allowed, false);
});

test("isAIToolsAllowed allows expired time-limited killswitch", () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
    const result = isAIToolsAllowed({ enabled: true, duration: pastDate });
    assert.strictEqual(result.allowed, true);
});

test("isAIToolsAllowed blocks during schedule (weekday 10:00, disabled 09:00-17:00)", () => {
    // Create a Wednesday at 10:00 AM
    const wednesday = new Date(2026, 6, 29, 10, 0); // Wed Jul 29 2026
    const result = isAIToolsAllowed({
        enabled: true,
        schedule: { disable: "09:00", enable: "17:00", daysOfWeek: [1, 2, 3, 4, 5] }
    }, wednesday);
    assert.strictEqual(result.allowed, false);
});

test("isAIToolsAllowed allows outside schedule (weekday 18:00, disabled 09:00-17:00)", () => {
    const wednesday = new Date(2026, 6, 29, 18, 0); // Wed Jul 29 2026 18:00
    const result = isAIToolsAllowed({
        enabled: true,
        schedule: { disable: "09:00", enable: "17:00", daysOfWeek: [1, 2, 3, 4, 5] }
    }, wednesday);
    assert.strictEqual(result.allowed, true);
});

test("isAIToolsAllowed allows on non-restricted day", () => {
    const sunday = new Date(2026, 6, 26, 10, 0); // Sun Jul 26 2026
    const result = isAIToolsAllowed({
        enabled: true,
        schedule: { disable: "09:00", enable: "17:00", daysOfWeek: [1, 2, 3, 4, 5] }
    }, sunday);
    assert.strictEqual(result.allowed, true);
});

test("isAIToolsAllowed returns allowed when no killswitch config", () => {
    const result = isAIToolsAllowed(null);
    assert.strictEqual(result.allowed, true);
});

test("parseTime parses valid time strings", () => {
    assert.strictEqual(parseTime("09:00"), 540);
    assert.strictEqual(parseTime("17:30"), 1050);
    assert.strictEqual(parseTime("00:00"), 0);
    assert.strictEqual(parseTime("23:59"), 1439);
});

test("parseTime returns null for invalid inputs", () => {
    assert.strictEqual(parseTime(null), null);
    assert.strictEqual(parseTime(""), null);
    assert.strictEqual(parseTime("invalid"), null);
    assert.strictEqual(parseTime("25:00"), null);
    assert.strictEqual(parseTime("12:60"), null);
});

test("isUserExempt returns false for null identity", () => {
    assert.strictEqual(isUserExempt({ exemptions: [] }, null), false);
});

test("isUserExempt returns true for exempt user", () => {
    const ks = {
        exemptions: [
            { type: "user", identifier: "alice@company.com" },
            { type: "group", identifier: "security-team" }
        ]
    };
    assert.strictEqual(isUserExempt(ks, "alice@company.com"), true);
});

test("isUserExempt returns false for non-exempt user", () => {
    const ks = {
        exemptions: [{ type: "user", identifier: "alice@company.com" }]
    };
    assert.strictEqual(isUserExempt(ks, "bob@company.com"), false);
});

console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed > 0 ? 1 : 0);
