const MASKIT_SUPPORTED_SITES = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://mail.google.com/*"
];

const REGEX_LIMITS = {
  maxPatternLength: 120,
  maxCustomRules: 15,
  maxScanLength: 50000
};

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
  pauseAutoResumeSecs: 30,
  browserAIProtection: true
};

const MASKIT_STATS_DEFAULTS = {
  totalRedactions: 0,
  byType: {},
  bySource: { paste: 0, copy: 0, typing: 0 }
};

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

function maskPreview(value) {
  const text = String(value || "");
  if (text.length <= 4) return "***";
  return text.slice(0, 2) + "***" + text.slice(-2);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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

function limitScanText(text) {
  const value = String(text || "");
  if (value.length <= REGEX_LIMITS.maxScanLength) {
    return value;
  }
  return value.slice(0, REGEX_LIMITS.maxScanLength);
}
