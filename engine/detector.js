/**
 * Maskit Shared Engine — Detection & Sanitization
 * Standalone Node.js module (no browser APIs).
 * Shared by browser extension and MCP server.
 */

const {
    REGEX_LIMITS,
    SEVERITY_DEFAULTS,
    SEVERITY_WEIGHTS,
    validateCustomRegexPattern,
    limitScanText,
    selectPolicy,
    getPolicyAction,
    createAuditEvent
} = require("./settings");

// ── Severity levels ─────────────────────────────────────────────────────────

const SEVERITY_LEVELS = ["critical", "high", "medium", "low"];

function getRiskLevel(score) {
    if (score >= 50) return "critical";
    if (score >= 25) return "high";
    if (score >= 10) return "medium";
    return "low";
}

function calculateRiskScore(findings, settings) {
    let score = 0;
    const severity = (settings && settings.severity) || SEVERITY_DEFAULTS;
    findings.forEach((f) => {
        const typeBase = f.type.replace(/^CUSTOM:/, "");
        const level = severity[typeBase] || severity.CUSTOM || "medium";
        score += SEVERITY_WEIGHTS[level] || 10;
    });
    return Math.min(100, score);
}

// ── Core detection patterns ─────────────────────────────────────────────────

const patterns = {
    EMAIL: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    PHONE: /(\+254|0)[17]\d{8}/g,
    CARD: /\b(?:\d[ -]*?){13,16}\b/g,
    MPESA: /\b[A-Z0-9]{10}\b/g,
    SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
    IP_ADDRESS: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    PASSPORT: /\b[A-Z]{1,2}\d{6,9}\b/g,
    BANK_ACCOUNT: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi
};

// ── API key patterns (expanded for cloud providers) ──────────────────────────

const API_KEY_PATTERNS = [
    // OpenAI
    /\bsk-(?:proj-)?[a-zA-Z0-9_-]{20,}\b/g,
    // Anthropic
    /\bsk-ant(?:-[a-z]+){0,3}-[a-zA-Z0-9_-]{20,}\b/g,
    // Stripe
    /\b(?:sk|pk|rk)_(?:live|test)_[a-zA-Z0-9]{24,}\b/g,
    // GitHub
    /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
    /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g,
    // GitLab
    /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
    // Slack
    /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
    // AWS
    /\bAKIA[0-9A-Z]{16}\b/g,
    /\b(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*["']?[A-Za-z0-9/+=]{40}/gi,
    // Google (GCP)
    /\bAIza[0-9A-Za-z_-]{35}\b/g,
    /\bya29\.[A-Za-z0-9_-]{20,}\b/g,
    // npm
    /\bnpm_[A-Za-z0-9]{36}\b/g,
    // Square
    /\bsq0[a-z]{3}-[A-Za-z0-9_-]{22,}\b/g,
    // Bearer tokens
    /\bBearer\s+[A-Za-z0-9._\-+/=]{20,}\b/gi,
    // Config assignments
    /\b(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*["']?[A-Za-z0-9_\-./+=]{16,}/gi,
    // Azure connection strings
    /\bDefaultEndpointsProtocol=https;AccountName=[A-Za-z0-9]+;AccountKey=[A-Za-z0-9+/=]{44,};/g,
    // Azure AD tokens (JWT format with common Azure header)
    /\beyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9\.[A-Za-z0-9._\-+/=]{20,}/g,
    // Azure subscription keys
    /\b[a-f0-9]{32}\b(?=\s*;?\s*(?:subscription|key|secret))/gi,
    // DigitalOcean
    /\b(?:do_token_|dop_v1_)[A-Za-z0-9]{20,}\b/g,
    // Twilio
    /\bAC[a-f0-9]{32}\b/g,
    // Datadog
    /\b(?:dd_|datadog_)[A-Za-z0-9]{20,}\b/g,
    // SendGrid
    /\bSG\.[A-Za-z0-9_-]{22,}\.[A-Za-z0-9_-]{22,}\b/g,
    // Jira / Atlassian
    /\b(?:atlassian[-_]token|jira[-_]api[-_]key)\s*[=:]\s*["']?[A-Za-z0-9_\-]{20,}/gi,
    // Terraform Cloud
    /\b(?:TF_TOKEN_|terraform[-_]token[-_])[A-Za-z0-9_\-]{10,}\b/g,
    // Docker Hub
    /\bdckr_pat_[A-Za-z0-9_]{20,}\b/g,
    // Kubernetes service account tokens
    /\beyJhbGciOiJSUzI1NiIsImtpZCI6[A-Za-z0-9_-]{20,}/g,
    // Cloudflare
    /\b(?:CF_|cloudflare[-_]api[-_]token[-_])[A-Za-z0-9_\-]{30,}\b/gi,
    // Auth0
    /\bauth0\|[A-Za-z0-9_\-]{20,}\b/g,
    // Firebase
    /\b(?:FIREBASE_|firebase[-_]api[-_]key[-_])[A-Za-z0-9_\-]{20,}\b/gi,
    // Azure DevOps
    /\b(?:AZDO_|azure[-_]devops[-_]token[-_])[A-Za-z0-9_\-]{20,}\b/gi,
    // GCP service account private key
    /\b(?:private[-_]key|PRIVATE[-_]KEY)\s*[=:]\s*["']?-----BEGIN (?:RSA )?PRIVATE KEY-----/gi,
    // Generic cloud secret patterns
    /\b(?:client[-_]secret|CLIENT[-_]SECRET)\s*[=:]\s*["']?[A-Za-z0-9_\-./+=]{20,}/gi
];

// ── False positive validators ───────────────────────────────────────────────

function luhnCheck(value) {
    const digits = String(value).replace(/\D/g, "");

    if (digits.length < 13 || digits.length > 19) {
        return false;
    }

    let sum = 0;
    let alternate = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits[i], 10);

        if (alternate) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        alternate = !alternate;
    }

    return sum % 10 === 0;
}

function validateFinding(type, value) {
    const text = String(value || "");

    switch (type) {
        case "CARD":
            return luhnCheck(text);

        case "MPESA": {
            const upper = text.toUpperCase();
            if (upper !== text.replace(/[^A-Za-z0-9]/g, (char) => char.toUpperCase())) return false;
            const letters = (upper.match(/[A-Z]/g) || []).length;
            const digits = (upper.match(/[0-9]/g) || []).length;
            if (letters < 2 || digits < 2) return false;
            if (letters > 8 || digits > 8) return false;
            if (/^(.)\1+$/.test(upper)) return false;
            return true;
        }

        case "PASSPORT": {
            if (!/[A-Z]/.test(text) || !/\d/.test(text)) return false;
            if (text.length < 8) return false;
            return true;
        }

        case "IP_ADDRESS": {
            const parts = text.split(".").map((part) => Number(part));
            if (parts.some((part) => Number.isNaN(part))) return false;
            if (parts.every((part) => part < 12)) return false;
            if (parts[0] === 127 || parts.every((part) => part === 0)) return false;
            return true;
        }

        case "API_KEY": {
            if (/Bearer\s+/i.test(text)) return text.replace(/Bearer\s+/i, "").length >= 20;
            if (/[=:]\s*/.test(text)) return true;
            return text.length >= 20;
        }

        case "BANK_ACCOUNT":
            return text.length >= 15;

        default:
            return true;
    }
}

// ── Custom rule compiler ────────────────────────────────────────────────────

function compileCustomRule(pattern) {
    const validation = validateCustomRegexPattern(pattern);
    if (!validation.ok) return null;

    try {
        return new RegExp(pattern, "gi");
    } catch {
        return null;
    }
}

// ── Deduplication ───────────────────────────────────────────────────────────

function dedupeFindings(findings) {
    const seen = new Set();

    return findings.filter((item) => {
        const key = item.type + ":" + item.value;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ── Core detection ──────────────────────────────────────────────────────────

function detectSensitiveData(text, settings) {
    const findings = [];
    const scanText = limitScanText(text);

    // 1. Standard data detectors
    Object.entries(patterns).forEach(([type, regex]) => {
        if (settings[type] === false) return;

        regex.lastIndex = 0;
        const matches = scanText.match(regex);

        if (matches) {
            matches.forEach((match) => {
                if (validateFinding(type, match)) {
                    const severity = (settings.severity || SEVERITY_DEFAULTS)[type] || "medium";
                    findings.push({ type, value: match, severity, ruleName: type });
                }
            });
        }
    });

    // 2. API key / cloud key detectors
    if (settings.API_KEY !== false) {
        const apiKeySeverity = (settings.severity || SEVERITY_DEFAULTS).API_KEY || "critical";
        API_KEY_PATTERNS.forEach((regex) => {
            regex.lastIndex = 0;
            const matches = scanText.match(regex);

            if (matches) {
                matches.forEach((match) => {
                    if (validateFinding("API_KEY", match)) {
                        findings.push({
                            type: "API_KEY",
                            value: match,
                            severity: apiKeySeverity,
                            ruleName: "API_KEY"
                        });
                    }
                });
            }
        });
    }

    // 3. Custom regex rules
    (settings.customRules || []).forEach((rule) => {
        if (!rule || rule.enabled === false || !rule.pattern) return;

        const regex = compileCustomRule(rule.pattern);
        if (!regex) return;

        regex.lastIndex = 0;
        const matches = scanText.match(regex);

        if (matches) {
            const type = "CUSTOM:" + (rule.name || rule.id || "RULE");
            matches.forEach((match) => {
                findings.push({
                    type,
                    value: match,
                    severity: (settings.severity || SEVERITY_DEFAULTS).CUSTOM || "medium",
                    ruleName: rule.name || rule.id || "RULE"
                });
            });
        }
    });

    return dedupeFindings(findings);
}

// ── Redaction text generation ───────────────────────────────────────────────

function getRedactionText(type, settings) {
    const format = (settings && settings.redactFormat) || "tagged";

    if (format === "stars") return "***";
    if (format === "custom") {
        return (settings && settings.customRedactText) || "[REDACTED]";
    }

    const label = String(type).replace(/^CUSTOM:/, "");
    return "[" + label + "_REDACTED]";
}

// ── Sanitization ────────────────────────────────────────────────────────────

function sanitizeText(text, findings, settings) {
    const config = settings || {};
    let sanitized = text;

    findings.forEach((item) => {
        sanitized = sanitized.replaceAll(
            item.value,
            getRedactionText(item.type, config)
        );
    });

    return sanitized;
}

// ── Public API ──────────────────────────────────────────────────────────────

function applyPolicyToFindings(findings, context, settings) {
    const policy = selectPolicy(context, settings);
    const results = [];

    findings.forEach(function (f) {
        const typeBase = f.type.replace(/^CUSTOM:/, "");
        const action = getPolicyAction(policy, typeBase);
        results.push({
            finding: f,
            action: action,
            format: (policy[typeBase] && policy[typeBase].format) || undefined
        });
    });

    return results;
}

function scanText(text, settings) {
    const mergedSettings = Object.assign({}, require("./settings").MASKIT_DEFAULTS, settings || {});
    const context = (settings && settings._context) || {};
    const findings = detectSensitiveData(text, mergedSettings);
    const riskScore = calculateRiskScore(findings, mergedSettings);
    const riskLevel = getRiskLevel(riskScore);

    // Apply role-based policy to determine actions per finding
    const policyDecisions = applyPolicyToFindings(findings, context, settings);
    const policy = selectPolicy(context, settings);

    // Filter out "allow" decisions — only redact/block items
    const actionableFindings = policyDecisions
        .filter(function (d) { return d.action !== "allow"; })
        .map(function (d) { return d.finding; });

    const redactedText = sanitizeText(text, actionableFindings, mergedSettings);
    const matchedRules = findings.map(function (f) { return f.type; });

    // Generate audit events for each finding
    const events = policyDecisions.map(function (d) {
        return createAuditEvent({
            type: d.finding.type,
            severity: d.finding.severity,
            source: context.source || "unknown",
            app: context.app || context.domain || "unknown",
            action: d.action === "allow" ? "allowed" : (d.action === "block" ? "blocked" : "redacted"),
            riskScore: riskScore,
            matchedRule: d.finding.ruleName || d.finding.type,
            policyApplied: context.policyName || "default",
            value: d.finding.value
        });
    });

    return {
        findings: actionableFindings,
        allFindings: findings,
        policyDecisions: policyDecisions,
        redactedText: redactedText,
        riskScore: riskScore,
        riskLevel: riskLevel,
        matchedRules: matchedRules,
        events: events
    };
}

function redactText(text, settings) {
    const mergedSettings = Object.assign({}, require("./settings").MASKIT_DEFAULTS, settings || {});
    const context = (settings && settings._context) || {};
    const findings = detectSensitiveData(text, mergedSettings);

    // Apply policy
    const policyDecisions = applyPolicyToFindings(findings, context, settings);
    const actionableFindings = policyDecisions
        .filter(function (d) { return d.action !== "allow"; })
        .map(function (d) { return d.finding; });

    const redactedText = sanitizeText(text, actionableFindings, mergedSettings);

    return { redactedText, findings: actionableFindings, allFindings: findings };
}

function evaluatePolicy(text, settings) {
    const result = scanText(text, settings);
    const hasFindings = result.policyDecisions && result.policyDecisions.length > 0;
    const blocked = result.policyDecisions
        ? result.policyDecisions.filter(function (d) { return d.action === "block"; })
        : [];
    const allowed = result.policyDecisions
        ? result.policyDecisions.filter(function (d) { return d.action === "allow"; })
        : [];
    const redacted = result.policyDecisions
        ? result.policyDecisions.filter(function (d) { return d.action === "redact"; })
        : [];

    return {
        allowed: blocked.length === 0,
        findings: result.findings,
        allFindings: result.allFindings,
        policyDecisions: result.policyDecisions,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        blocked: blocked.length,
        allowedByPolicy: allowed.length,
        redacted: redacted.length,
        reason: hasFindings
            ? "Found " + result.allFindings.length + " sensitive item(s): " +
            blocked.length + " blocked, " + redacted.length + " redacted, " + allowed.length + " allowed"
            : "No sensitive data detected"
    };
}

function getRules(settings) {
    const types = Object.keys(patterns).concat(["API_KEY"]);
    const rules = types.map((type) => ({
        type,
        enabled: (settings || {})[type] !== false,
        severity: (settings || {}).severity
            ? (settings.severity[type] || SEVERITY_DEFAULTS[type] || "medium")
            : (SEVERITY_DEFAULTS[type] || "medium")
    }));

    return {
        rules,
        customRules: ((settings || {}).customRules || []).map((r) => ({
            id: r.id,
            name: r.name,
            pattern: r.pattern,
            enabled: r.enabled !== false
        }))
    };
}

function updateRules(newCustomRules, settings) {
    const updated = Object.assign({}, settings || {});
    updated.customRules = (newCustomRules || []).filter((r) => {
        if (!r || !r.pattern) return false;
        const validation = validateCustomRegexPattern(r.pattern);
        return validation.ok;
    }).slice(0, REGEX_LIMITS.maxCustomRules);
    return updated;
}

function getStatus() {
    return {
        version: "2.4.0",
        engineReady: true,
        rulesEnabled: Object.keys(patterns).length + API_KEY_PATTERNS.length
    };
}

// ── Module exports ──────────────────────────────────────────────────────────

module.exports = {
    patterns,
    API_KEY_PATTERNS,
    SEVERITY_DEFAULTS,
    SEVERITY_WEIGHTS,
    SEVERITY_LEVELS,
    detectSensitiveData,
    sanitizeText,
    getRedactionText,
    calculateRiskScore,
    getRiskLevel,
    luhnCheck,
    validateFinding,
    compileCustomRule,
    scanText,
    redactText,
    evaluatePolicy,
    getRules,
    updateRules,
    getStatus
};