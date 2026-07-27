/**
 * Maskit Shared Engine — Settings & Policy Helpers
 * Standalone Node.js module (no browser APIs).
 * Shared by browser extension and MCP server.
 */

// ── Supported sites ─────────────────────────────────────────────────────────

const MASKIT_SUPPORTED_SITES = [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://mail.google.com/*"
];

// ── Regex safety limits ─────────────────────────────────────────────────────

const REGEX_LIMITS = {
    maxPatternLength: 120,
    maxCustomRules: 15,
    maxScanLength: 50000
};

// ── Default settings ────────────────────────────────────────────────────────

const MASKIT_DEFAULTS = {
    enabled: true,
    scanPaste: true,
    scanCopy: false,
    scanTyping: true,
    reviewBeforeRedact: true,
    redactFormat: "stars",
    customRedactText: "[REDACTED]",
    siteListMode: "all",
    siteList: [],
    EMAIL: true,
    PHONE: true,
    CARD: true,
    MPESA: true,
    SSN: true,
    API_KEY: true,
    IP_ADDRESS: true,
    PASSPORT: true,
    BANK_ACCOUNT: true,
    customRules: [],
    pauseAutoResume: true,
    pauseAutoResumeSecs: 30,
    browserAIProtection: true
};

// ── Severity defaults ───────────────────────────────────────────────────────

const SEVERITY_DEFAULTS = {
    API_KEY: "critical",
    CARD: "critical",
    SSN: "critical",
    BANK_ACCOUNT: "critical",
    PASSPORT: "high",
    IP_ADDRESS: "high",
    EMAIL: "medium",
    PHONE: "medium",
    MPESA: "low",
    CUSTOM: "medium"
};

const SEVERITY_WEIGHTS = { critical: 50, high: 25, medium: 10, low: 5 };

const SEVERITY_LEVELS = ["critical", "high", "medium", "low"];

// ── Stats defaults (legacy, kept for migration) ─────────────────────────────

const MASKIT_STATS_DEFAULTS = {
    totalRedactions: 0,
    byType: {},
    bySource: { paste: 0, copy: 0, typing: 0 }
};

// ── Audit log schema ───────────────────────────────────────────────────────

const AUDIT_LOG_DEFAULTS = {
    events: [],
    retentionDays: 30
};

/**
 * Create a structured audit event.
 * @param {Object} opts
 * @param {string} opts.type - Data type (EMAIL, API_KEY, etc.)
 * @param {string} opts.severity - Severity level (critical, high, medium, low)
 * @param {string} opts.source - Event source (paste, copy, typing, contextMenu)
 * @param {string} opts.app - Hostname or app identifier
 * @param {string} opts.action - Action taken (redacted, blocked, allowed, unmasked)
 * @param {number} opts.riskScore - Risk score at time of detection
 * @param {string} opts.matchedRule - Rule that matched
 * @param {string} opts.policyApplied - Policy name that was applied
 * @param {string} [opts.value] - Original value (hashed for unmasking)
 * @returns {Object} Structured audit event
 */
/**
 * Compute chain hash for audit event tamper detection.
 * chainHash = SHA-256(previous_event_chainHash + current_event_id + current_event_timestamp)
 * First event uses "0" as the previous hash.
 */
function computeChainHash(previousHash, eventId, timestamp) {
    const input = (previousHash || "0") + eventId + timestamp;
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    return hash;
}

function createAuditEvent({ type, severity, source, app, action, riskScore, matchedRule, policyApplied, value, saltProvider, chainHash }) {
    return {
        id: "evt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        timestamp: Date.now(),
        type: String(type || "UNKNOWN"),
        severity: String(severity || "medium"),
        source: String(source || "unknown"),
        app: String(app || "unknown"),
        action: String(action || "redacted"),
        riskScore: Number(riskScore) || 0,
        matchedRule: String(matchedRule || ""),
        policyApplied: String(policyApplied || "default"),
        unmaskToken: value ? hashSensitive(value, saltProvider) : null,
        unmaskedAt: null,
        unmaskedDuration: null,
        chainHash: chainHash || null
    };
}

/**
 * Deterministic hash for unmasking tokens.
 * Same value + salt always produces the same token.
 * Raw values are never stored.
 *
 * Uses SHA-256 (cryptographic) with a per-installation random salt.
 * In Node.js: uses crypto.createHash (sync).
 * In browser: uses crypto.subtle.digest (async) — see hashSensitiveAsync().
 */
const crypto = require("crypto");

let _hashSalt = null;

function getHashSalt(saltProvider) {
    if (_hashSalt) return _hashSalt;

    // Try to get salt from provider (config in Node, chrome.storage in browser)
    if (saltProvider && typeof saltProvider.getHashSalt === "function") {
        _hashSalt = saltProvider.getHashSalt();
    }

    if (!_hashSalt) {
        // Generate random 32-byte salt
        if (typeof crypto !== "undefined" && crypto.randomBytes) {
            // Node.js
            _hashSalt = crypto.randomBytes(32).toString("hex");
        } else if (typeof crypto !== "undefined" && crypto.getRandomValues) {
            // Browser
            const arr = new Uint8Array(32);
            crypto.getRandomValues(arr);
            _hashSalt = Array.from(arr).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
        } else {
            // Fallback (should not happen in modern environments)
            _hashSalt = "fallback-salt-" + Date.now() + Math.random();
        }

        // Save salt
        if (saltProvider && typeof saltProvider.setHashSalt === "function") {
            saltProvider.setHashSalt(_hashSalt);
        }
    }

    return _hashSalt;
}

function hashSensitive(value, saltProvider) {
    if (!value) return "";

    const salt = getHashSalt(saltProvider);

    // Node.js: use crypto.createHash (sync)
    if (typeof crypto !== "undefined" && crypto.createHash) {
        return crypto
            .createHash("sha256")
            .update(String(value) + salt)
            .digest("hex");
    }

    // Browser fallback: use a simple hash (should use hashSensitiveAsync instead)
    // This is a non-cryptographic fallback for environments without crypto.subtle
    const input = String(value) + salt;
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
}

/**
 * Async hash for browser environments using crypto.subtle.
 * Same value + salt always produces the same token.
 */
async function hashSensitiveAsync(value, saltProvider) {
    if (!value) return "";

    const salt = getHashSalt(saltProvider);

    // Browser: crypto.subtle.digest (async)
    if (typeof crypto !== "undefined" && crypto.subtle && typeof crypto.subtle.digest === "function") {
        const encoder = new TextEncoder();
        const data = encoder.encode(String(value) + salt);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    }

    // Fallback to sync version (Node.js)
    return hashSensitive(value, saltProvider);
}

/**
 * Prune audit events older than retention window.
 */
function pruneAuditLog(events, retentionDays) {
    const cutoff = Date.now() - (retentionDays || 30) * 24 * 60 * 60 * 1000;
    return (events || []).filter(function (e) { return e.timestamp >= cutoff; });
}

// ── Role-based policy defaults ──────────────────────────────────────────────

const POLICY_ACTIONS = ["allow", "redact", "block"];

const MASKIT_POLICY_DEFAULTS = {
    activePolicy: "default",
    policies: {
        "default": {
            EMAIL: { action: "redact" },
            PHONE: { action: "redact" },
            API_KEY: { action: "redact" },
            CARD: { action: "block" },
            SSN: { action: "block" },
            BANK_ACCOUNT: { action: "block" },
            PASSPORT: { action: "redact" },
            IP_ADDRESS: { action: "redact" },
            MPESA: { action: "redact" }
        }
    }
};

/**
 * Select the appropriate policy based on context.
 * Context can include: app, domain, model, userRole.
 */
function selectPolicy(context, settings) {
    const policies = (settings && settings.policies) || MASKIT_POLICY_DEFAULTS.policies;
    const ctx = context || {};

    // Try app-specific policy first
    if (ctx.app && policies[ctx.app]) return policies[ctx.app];
    // Try domain-specific policy
    if (ctx.domain && policies[ctx.domain]) return policies[ctx.domain];
    // Fall back to default
    return policies["default"] || {};
}

/**
 * Get the action for a specific data type from a policy.
 */
function getPolicyAction(policy, dataType) {
    const entry = policy[dataType];
    if (!entry) return "redact"; // default action
    return POLICY_ACTIONS.includes(entry.action) ? entry.action : "redact";
}

// ── Killswitch (Phase 5: Enterprise admin control) ────────────────────────

const KILLSWITCH_DEFAULTS = {
    enabled: false,
    message: "AI tools are restricted by Admin on this organization",
    duration: null,       // null = indefinite, or ISO 8601 datetime for auto-enable
    exemptions: [],       // e.g., [{ type: "user", identifier: "alice@company.com" }]
    schedule: null        // e.g., { disable: "17:00", enable: "09:00", daysOfWeek: [1,2,3,4,5] }
};

/**
 * Check if AI tools are allowed based on killswitch configuration.
 * @param {Object} killswitch - Killswitch config from settings
 * @param {Date} [now] - Current time (for testing)
 * @returns {{ allowed: boolean, reason: string }}
 */
function isAIToolsAllowed(killswitch, now) {
    const ks = killswitch || KILLSWITCH_DEFAULTS;
    if (!ks.enabled) return { allowed: true, reason: "" };

    const currentTime = now || new Date();

    // Check schedule-based killswitch
    if (ks.schedule) {
        const hour = currentTime.getHours();
        const minute = currentTime.getMinutes();
        const day = currentTime.getDay(); // 0=Sun, 1=Mon, ...
        const currentMinutes = hour * 60 + minute;

        const disableTime = parseTime(ks.schedule.disable);
        const enableTime = parseTime(ks.schedule.enable);
        const daysOfWeek = ks.schedule.daysOfWeek || [1, 2, 3, 4, 5];

        if (daysOfWeek.includes(day)) {
            if (disableTime !== null && enableTime !== null) {
                if (disableTime > enableTime) {
                    // Overnight schedule (e.g., 17:00 to 09:00)
                    if (currentMinutes >= disableTime || currentMinutes < enableTime) {
                        return { allowed: false, reason: "AI tools disabled by schedule" };
                    }
                } else {
                    // Same-day schedule (e.g., 12:00 to 13:00)
                    if (currentMinutes >= disableTime && currentMinutes < enableTime) {
                        return { allowed: false, reason: "AI tools disabled by schedule" };
                    }
                }
            }
        }
        // Not in restricted schedule
        return { allowed: true, reason: "" };
    }

    // Check time-limited killswitch
    if (ks.duration) {
        const deadline = new Date(ks.duration);
        if (currentTime < deadline) {
            return { allowed: false, reason: "AI tools restricted until " + deadline.toISOString() };
        }
        // Duration expired — killswitch no longer active
        return { allowed: true, reason: "" };
    }

    // Indefinite killswitch
    return { allowed: false, reason: ks.message || "AI tools restricted by administrator" };
}

/**
 * Parse "HH:MM" time string to minutes since midnight.
 * @param {string} timeStr - Time string like "17:00"
 * @returns {number|null} Minutes since midnight, or null if invalid
 */
function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return null;
    const parts = timeStr.split(":");
    if (parts.length !== 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
}

/**
 * Get user identity for exemption checking.
 * In browser context, this returns null (no OS identity available).
 * In enterprise context (Phase 5.3), this would check LDAP/OS identity.
 */
function getUserIdentity() {
    return null;
}

/**
 * Check if a user is exempt from killswitch.
 * @param {Object} killswitch - Killswitch config
 * @param {string} userIdentity - User email or username
 * @returns {boolean}
 */
function isUserExempt(killswitch, userIdentity) {
    if (!userIdentity) return false;
    const ks = killswitch || KILLSWITCH_DEFAULTS;
    const exemptions = ks.exemptions || [];
    return exemptions.some(function (ex) {
        return ex.identifier === userIdentity;
    });
}

// ── Hostname matching ───────────────────────────────────────────────────────

function hostnameMatches(hostname, pattern) {
    const host = String(hostname || "").toLowerCase();
    const entry = String(pattern || "").trim().toLowerCase();

    if (!entry) return false;
    if (entry.startsWith("*.")) {
        const base = entry.slice(2);
        return host === base || host.endsWith("." + base);
    }
    return host === entry;
}

function isSiteAllowed(settings, hostname) {
    const list = (settings.siteList || [])
        .map((entry) => String(entry).trim())
        .filter(Boolean);
    const mode = settings.siteListMode || "all";

    if (mode === "allowlist") {
        if (!list.length) return false;
        return list.some((entry) => hostnameMatches(hostname, entry));
    }

    if (mode === "blocklist") {
        return !list.some((entry) => hostnameMatches(hostname, entry));
    }

    return true;
}

// ── UI helpers ──────────────────────────────────────────────────────────────

function maskPreview(value) {
    const text = String(value || "");
    if (text.length <= 4) return "***";
    return text.slice(0, 2) + "***" + text.slice(-2);
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "\u0026amp;")
        .replace(/</g, "\u0026lt;")
        .replace(/>/g, "\u0026gt;")
        .replace(/"/g, "\u0026quot;")
        .replace(/'/g, "\u0026#39;");
}

// ── Regex safety ────────────────────────────────────────────────────────────

function isRegexSafe(pattern) {
    const text = String(pattern || "").trim();

    if (!text || text.length > REGEX_LIMITS.maxPatternLength) {
        return false;
    }

    if (/\{(\d+)?,\}/.test(text)) {
        return false;
    }

    if (/(\([^)]*[+*][^)]*\))[+*{]/.test(text)) {
        return false;
    }

    if (/(\.\*)[+*]|\(\.\*\)[+*]/.test(text)) {
        return false;
    }

    if (/\([^)]+\)\{(\d+),\}/.test(text)) {
        return false;
    }

    return true;
}

function validateCustomRegexPattern(pattern) {
    const text = String(pattern || "").trim();

    if (!text) {
        return { ok: false, error: "Pattern is required." };
    }

    if (text.length > REGEX_LIMITS.maxPatternLength) {
        return { ok: false, error: `Pattern must be ${REGEX_LIMITS.maxPatternLength} characters or fewer.` };
    }

    if (!isRegexSafe(text)) {
        return { ok: false, error: "Pattern looks unsafe or too complex." };
    }

    try {
        new RegExp(text);
    } catch {
        return { ok: false, error: "Invalid regex syntax." };
    }

    return { ok: true };
}

// ── Scan text limiter ───────────────────────────────────────────────────────

function limitScanText(text) {
    const value = String(text || "");
    if (value.length <= REGEX_LIMITS.maxScanLength) {
        return value;
    }
    return value.slice(0, REGEX_LIMITS.maxScanLength);
}

// ── Module exports ──────────────────────────────────────────────────────────

module.exports = {
    MASKIT_SUPPORTED_SITES,
    REGEX_LIMITS,
    MASKIT_DEFAULTS,
    SEVERITY_DEFAULTS,
    SEVERITY_WEIGHTS,
    SEVERITY_LEVELS,
    MASKIT_STATS_DEFAULTS,
    AUDIT_LOG_DEFAULTS,
    createAuditEvent,
    hashSensitive,
    hashSensitiveAsync,
    getHashSalt,
    pruneAuditLog,
    POLICY_ACTIONS,
    MASKIT_POLICY_DEFAULTS,
    selectPolicy,
    getPolicyAction,
    hostnameMatches,
    isSiteAllowed,
    maskPreview,
    escapeHtml,
    isRegexSafe,
    validateCustomRegexPattern,
    limitScanText,

    // Killswitch
    KILLSWITCH_DEFAULTS,
    isAIToolsAllowed,
    parseTime,
    getUserIdentity,
    isUserExempt
};
