const MASKIT_SUPPORTED_SITES = ["https://chatgpt.com/*", "https://chat.openai.com/*", "https://claude.ai/*", "https://gemini.google.com/*", "https://copilot.microsoft.com/*", "https://*.cursor.com/*"];
const REGEX_LIMITS = { maxPatternLength: 120, maxCustomRules: 15, maxScanLength: 50000 };
const MASKIT_DEFAULTS = { enabled: true, scanPaste: true, scanCopy: false, scanTyping: true, reviewBeforeRedact: true, redactFormat: "stars", customRedactText: "[REDACTED]", siteListMode: "all", siteList: [], EMAIL: true, PHONE: true, CARD: true, MPESA: true, SSN: true, API_KEY: true, IP_ADDRESS: true, PASSPORT: true, BANK_ACCOUNT: true, customRules: [], pauseAutoResume: true, pauseAutoResumeSecs: 30, browserAIProtection: true };
const SEVERITY_DEFAULTS = { API_KEY: "critical", CARD: "critical", SSN: "critical", BANK_ACCOUNT: "critical", PASSPORT: "high", IP_ADDRESS: "high", EMAIL: "medium", PHONE: "medium", MPESA: "low", CUSTOM: "medium" };
const SEVERITY_WEIGHTS = { critical: 50, high: 25, medium: 10, low: 5 };
const SEVERITY_LEVELS = ["critical", "high", "medium", "low"];
const MASKIT_STATS_DEFAULTS = { totalRedactions: 0, byType: {}, bySource: { paste: 0, copy: 0, typing: 0 } };
const AUDIT_LOG_DEFAULTS = { events: [], retentionDays: 30 };
const POLICY_ACTIONS = ["allow", "redact", "block"];
const MASKIT_POLICY_DEFAULTS = { activePolicy: "default", policies: { default: { EMAIL: { action: "redact" }, PHONE: { action: "redact" }, API_KEY: { action: "redact" }, CARD: { action: "block" }, SSN: { action: "block" }, BANK_ACCOUNT: { action: "block" }, PASSPORT: { action: "redact" }, IP_ADDRESS: { action: "redact" }, MPESA: { action: "redact" } } } };
const KILLSWITCH_DEFAULTS = { enabled: false, message: "AI tools are restricted by Admin on this organization", duration: null, exemptions: [], schedule: null };
const crypto = require("crypto"); let _hashSalt = null;
function getHashSalt(saltProvider) { if (_hashSalt) return _hashSalt; if (saltProvider && typeof saltProvider.getHashSalt === "function") _hashSalt = saltProvider.getHashSalt(); if (!_hashSalt) _hashSalt = crypto.randomBytes(32).toString("hex"); if (saltProvider && typeof saltProvider.setHashSalt === "function") saltProvider.setHashSalt(_hashSalt); return _hashSalt; }
function hashSensitive(value, saltProvider) { return value ? crypto.createHash("sha256").update(String(value) + getHashSalt(saltProvider)).digest("hex") : ""; }
async function hashSensitiveAsync(value, saltProvider) { return hashSensitive(value, saltProvider); }
function eventTimestampMs(event) {
  if (!event) return 0;
  if (typeof event.timestamp === "number") return event.timestamp;
  const parsed = Date.parse(event.timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}
function pruneAuditLog(events, retentionDays) {
  const cutoff = Date.now() - (retentionDays || 30) * 86400000;
  return (events || []).filter((e) => eventTimestampMs(e) >= cutoff);
}
function selectPolicy(context, settings) { const policies = (settings && settings.policies) || MASKIT_POLICY_DEFAULTS.policies; const ctx = context || {}; return (ctx.app && policies[ctx.app]) || (ctx.domain && policies[ctx.domain]) || policies.default || {}; }
function getPolicyAction(policy, dataType) { const action = policy[dataType] && policy[dataType].action; return POLICY_ACTIONS.includes(action) ? action : "redact"; }
function isAIToolsAllowed(killswitch, now = new Date()) { const ks = killswitch || KILLSWITCH_DEFAULTS; if (!ks.enabled) return { allowed: true, reason: "" }; if (ks.duration && now < new Date(ks.duration)) return { allowed: false, reason: "AI tools restricted until " + new Date(ks.duration).toISOString() }; if (!ks.duration && !ks.schedule) return { allowed: false, reason: ks.message }; if (ks.schedule) { const disable = parseTime(ks.schedule.disable), enable = parseTime(ks.schedule.enable), day = now.getDay(), minutes = now.getHours() * 60 + now.getMinutes(); if (ks.schedule.daysOfWeek?.includes(day) && disable !== null && enable !== null && (disable > enable ? minutes >= disable || minutes < enable : minutes >= disable && minutes < enable)) return { allowed: false, reason: "AI tools disabled by schedule" }; } return { allowed: true, reason: "" }; }
function parseTime(value) { if (typeof value !== "string") return null; const [h, m] = value.split(":").map(Number); return Number.isInteger(h) && Number.isInteger(m) && h >= 0 && h < 24 && Number.isInteger(m) && m >= 0 && m < 60 ? h * 60 + m : null; }
function getUserIdentity() { return null; }
function isUserExempt(killswitch, identity) { return !!identity && (killswitch?.exemptions || []).some((e) => e.identifier === identity); }
function hostnameMatches(hostname, pattern) { const host = String(hostname || "").toLowerCase(), entry = String(pattern || "").trim().toLowerCase(); if (!entry) return false; if (entry.startsWith("*.")) { const base = entry.slice(2); return host === base || host.endsWith("." + base); } return host === entry; }
function isSiteAllowed(settings, hostname) { const list = (settings.siteList || []).map(String).map((e) => e.trim()).filter(Boolean), mode = settings.siteListMode || "all"; if (mode === "allowlist") return list.length > 0 && list.some((e) => hostnameMatches(hostname, e)); if (mode === "blocklist") return !list.some((e) => hostnameMatches(hostname, e)); return true; }
function maskPreview(value) { const text = String(value || ""); return text.length <= 4 ? "***" : text.slice(0, 2) + "***" + text.slice(-2); }
function escapeHtml(value) { return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
function isRegexSafe(pattern) { const text = String(pattern || "").trim(); return !!text && text.length <= REGEX_LIMITS.maxPatternLength && !(/\{(\d+)?,\}/.test(text) || /(\([^)]*[+*][^)]*\))[+*{]/.test(text) || /(\.\*)[+*]|\(\.\*\)[+*]/.test(text) || /\([^)]+\)\{(\d+),\}/.test(text) || /\([^()]*\|[^()]*\)[+*]/.test(text)); }
function validateCustomRegexPattern(pattern) { const text = String(pattern || "").trim(); if (!text) return { ok: false, error: "Pattern is required." }; if (text.length > REGEX_LIMITS.maxPatternLength) return { ok: false, error: `Pattern must be ${REGEX_LIMITS.maxPatternLength} characters or fewer.` }; if (!isRegexSafe(text)) return { ok: false, error: "Pattern looks unsafe or too complex." }; try { new RegExp(text); return { ok: true }; } catch { return { ok: false, error: "Invalid regex syntax." }; } }
function limitScanText(text) { const value = String(text || ""); return value.length <= REGEX_LIMITS.maxScanLength ? value : value.slice(0, REGEX_LIMITS.maxScanLength); }
module.exports = { MASKIT_SUPPORTED_SITES, REGEX_LIMITS, MASKIT_DEFAULTS, SEVERITY_DEFAULTS, SEVERITY_WEIGHTS, SEVERITY_LEVELS, MASKIT_STATS_DEFAULTS, AUDIT_LOG_DEFAULTS, hashSensitive, hashSensitiveAsync, getHashSalt, pruneAuditLog, eventTimestampMs, POLICY_ACTIONS, MASKIT_POLICY_DEFAULTS, selectPolicy, getPolicyAction, KILLSWITCH_DEFAULTS, isAIToolsAllowed, parseTime, getUserIdentity, isUserExempt, hostnameMatches, isSiteAllowed, maskPreview, escapeHtml, isRegexSafe, validateCustomRegexPattern, limitScanText };
