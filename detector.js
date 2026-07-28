/**
 * Browser detector — consumes MASKIT_RULE_BUNDLE generated from maskit-core/rules.
 * Same rule definitions and finding types as engine/detector.js.
 */
(function (root) {
  function limitText(text) {
    if (typeof limitScanText === "function") return limitScanText(text);
    try {
      const engineSettings = require("./engine/settings");
      if (engineSettings && typeof engineSettings.limitScanText === "function") {
        return engineSettings.limitScanText(text);
      }
    } catch {
      /* browser */
    }
    const value = String(text || "");
    return value.length <= 50000 ? value : value.slice(0, 50000);
  }

  function validateCustom(pattern) {
    if (typeof validateCustomRegexPattern === "function") return validateCustomRegexPattern(pattern);
    try {
      const engineSettings = require("./engine/settings");
      if (engineSettings && typeof engineSettings.validateCustomRegexPattern === "function") {
        return engineSettings.validateCustomRegexPattern(pattern);
      }
    } catch {
      /* browser */
    }
    try {
      new RegExp(pattern, "gi");
      return { ok: true };
    } catch {
      return { ok: false, error: "Invalid regex" };
    }
  }

  function getBundle() {
    if (typeof MASKIT_RULE_BUNDLE !== "undefined" && Array.isArray(MASKIT_RULE_BUNDLE)) {
      return MASKIT_RULE_BUNDLE;
    }
    try {
      return require("./engine/rule-loader").loadRuleBundle();
    } catch {
      return [];
    }
  }

  function luhnCheck(value) {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0, alternate = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      if (alternate) { digit *= 2; if (digit > 9) digit -= 9; }
      sum += digit;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  function validateFinding(type, value, validator) {
    const text = String(value || "");
    const v = validator || "none";
    if (v === "luhn" || type === "CARD") return luhnCheck(text);
    if (v === "mpesa" || type === "MPESA") {
      const upper = text.toUpperCase();
      const letters = (upper.match(/[A-Z]/g) || []).length;
      const digits = (upper.match(/[0-9]/g) || []).length;
      return letters >= 2 && digits >= 2 && letters <= 8 && digits <= 8 && !/^(.)\1+$/.test(upper);
    }
    if (v === "passport" || type === "PASSPORT") return /[A-Z]/.test(text) && /\d/.test(text) && text.length >= 8;
    if (v === "ip_address" || type === "IP_ADDRESS") {
      const parts = text.split(".").map(Number);
      return parts.length === 4 && parts.every((part) => part >= 0 && part <= 255) && !parts.every((part) => part < 12) && parts[0] !== 127 && !parts.every((part) => part === 0);
    }
    if (v === "api_key" || type === "API_KEY") {
      return /Bearer\s+/i.test(text) ? text.replace(/Bearer\s+/i, "").length >= 20 : /[=:]\s*/.test(text) || text.length >= 20;
    }
    if (v === "bank_account" || type === "BANK_ACCOUNT") return text.length >= 15;
    return true;
  }

  function compileCustomRule(pattern) {
    const validation = validateCustom(pattern);
    if (!validation.ok) return null;
    try { return new RegExp(pattern, "gi"); } catch { return null; }
  }

  function dedupeFindings(findings) {
    const seen = new Set();
    return findings.filter((item) => {
      const key = item.type + ":" + item.value;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function detectSensitiveData(text, settings) {
    const findings = [];
    const scanText = limitText(text);
    const bundle = getBundle();
    (bundle || []).forEach((rule) => {
      const enabledType = String(rule.id || "").indexOf("API_KEY") === 0 ? "API_KEY" : rule.id;
      if (settings[enabledType] === false) return;
      let regex;
      try { regex = new RegExp(rule.pattern, rule.flags || "g"); } catch { return; }
      const matches = scanText.match(regex) || [];
      const findingType = String(rule.id || "").indexOf("API_KEY") === 0 ? "API_KEY" : rule.id;
      matches.forEach((match) => {
        if (validateFinding(findingType, match, rule.validator)) {
          findings.push({
            type: findingType,
            value: match,
            severity: rule.severity || "medium",
            ruleName: rule.id
          });
        }
      });
    });
    (settings.customRules || []).forEach((rule) => {
      if (!rule || rule.enabled === false || !rule.pattern) return;
      const regex = compileCustomRule(rule.pattern);
      if (!regex) return;
      (scanText.match(regex) || []).forEach((match) => {
        findings.push({
          type: "CUSTOM:" + (rule.name || rule.id || "RULE"),
          value: match,
          severity: "medium",
          ruleName: rule.name || rule.id || "RULE"
        });
      });
    });
    return dedupeFindings(findings);
  }

  const api = { detectSensitiveData, dedupeFindings, compileCustomRule, validateFinding, luhnCheck };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.detectSensitiveData = detectSensitiveData;
  root.dedupeFindings = dedupeFindings;
  root.compileCustomRule = compileCustomRule;
  root.validateFinding = validateFinding;
  root.luhnCheck = luhnCheck;
})(typeof globalThis !== "undefined" ? globalThis : this);
