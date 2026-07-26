/**
 * Maskit Shared Engine — Public API
 * Entry point for the detection engine.
 * Used by both browser extension and MCP server.
 */

const {
    scanText,
    redactText,
    detectSensitiveData,
    sanitizeText,
    getRedactionText,
    calculateRiskScore,
    getRiskLevel,
    evaluatePolicy,
    getRules,
    updateRules,
    getStatus,
    patterns,
    API_KEY_PATTERNS,
    SEVERITY_DEFAULTS,
    SEVERITY_WEIGHTS,
    SEVERITY_LEVELS,
    luhnCheck,
    validateFinding,
    compileCustomRule
} = require("./detector");

const {
    MASKIT_DEFAULTS,
    MASKIT_SUPPORTED_SITES,
    MASKIT_STATS_DEFAULTS,
    AUDIT_LOG_DEFAULTS,
    createAuditEvent,
    hashSensitive,
    pruneAuditLog,
    POLICY_ACTIONS,
    MASKIT_POLICY_DEFAULTS,
    selectPolicy,
    getPolicyAction,
    KILLSWITCH_DEFAULTS,
    isAIToolsAllowed,
    parseTime,
    getUserIdentity,
    isUserExempt,
    REGEX_LIMITS,
    hostnameMatches,
    isSiteAllowed,
    maskPreview,
    escapeHtml,
    isRegexSafe,
    validateCustomRegexPattern,
    limitScanText
} = require("./settings");

module.exports = {
    // Core API
    scanText,
    redactText,
    evaluatePolicy,
    getRules,
    updateRules,
    getStatus,

    // Detection internals
    detectSensitiveData,
    sanitizeText,
    getRedactionText,
    calculateRiskScore,
    getRiskLevel,

    // Patterns
    patterns,
    API_KEY_PATTERNS,

    // Validation
    luhnCheck,
    validateFinding,
    compileCustomRule,

    // Settings & constants
    MASKIT_DEFAULTS,
    MASKIT_SUPPORTED_SITES,
    MASKIT_STATS_DEFAULTS,
    SEVERITY_DEFAULTS,
    SEVERITY_WEIGHTS,
    SEVERITY_LEVELS,
    REGEX_LIMITS,

    // Audit log
    AUDIT_LOG_DEFAULTS,
    createAuditEvent,
    hashSensitive,
    pruneAuditLog,

    // Role-based policies
    POLICY_ACTIONS,
    MASKIT_POLICY_DEFAULTS,
    selectPolicy,
    getPolicyAction,

    // Killswitch
    KILLSWITCH_DEFAULTS,
    isAIToolsAllowed,
    parseTime,
    getUserIdentity,
    isUserExempt,

    // Helpers
    hostnameMatches,
    isSiteAllowed,
    maskPreview,
    escapeHtml,
    isRegexSafe,
    validateCustomRegexPattern,
    limitScanText
};
