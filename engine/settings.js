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
    scanCopy: true,
    scanTyping: true,
    reviewBeforeRedact: false,
    redactFormat: "tagged",
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
    pauseAutoResumeSecs: 30
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

// ── Stats defaults ──────────────────────────────────────────────────────────

const MASKIT_STATS_DEFAULTS = {
    totalRedactions: 0,
    byType: {},
    bySource: { paste: 0, copy: 0, typing: 0 }
};

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
    hostnameMatches,
    isSiteAllowed,
    maskPreview,
    escapeHtml,
    isRegexSafe,
    validateCustomRegexPattern,
    limitScanText
};