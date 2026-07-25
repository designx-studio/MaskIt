const API_KEY_PATTERNS = [
  /\bsk-(?:proj-)?[a-zA-Z0-9_-]{20,}\b/g,
  /\bsk-ant(?:-[a-z]+){0,3}-[a-zA-Z0-9_-]{20,}\b/g,
  /\b(?:sk|pk|rk)_(?:live|test)_[a-zA-Z0-9]{24,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bnpm_[A-Za-z0-9]{36}\b/g,
  /\bsq0[a-z]{3}-[A-Za-z0-9_-]{22,}\b/g,
  /\bBearer\s+[A-Za-z0-9._\-+/=]{20,}\b/gi,
  /\b(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[=:]\s*["']?[A-Za-z0-9_\-./+=]{16,}/gi
];

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

function compileCustomRule(pattern) {
  const validation = validateCustomRegexPattern(pattern);
  if (!validation.ok) return null;

  try {
    return new RegExp(pattern, "gi");
  } catch {
    return null;
  }
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
  const scanText = limitScanText(text);
  Object.entries(patterns).forEach(([type, regex]) => {
    if (settings[type] === false) return;

    regex.lastIndex = 0;
    const matches = scanText.match(regex);

    if (matches) {
      matches.forEach((match) => {
        if (validateFinding(type, match)) {
          findings.push({ type, value: match });
        }
      });
    }
  });

  if (settings.API_KEY !== false) {
    API_KEY_PATTERNS.forEach((regex) => {
      regex.lastIndex = 0;
      const matches = scanText.match(regex);

      if (matches) {
        matches.forEach((match) => {
          if (validateFinding("API_KEY", match)) {
            findings.push({ type: "API_KEY", value: match });
          }
        });
      }
    });
  }

  (settings.customRules || []).forEach((rule) => {
    if (!rule || rule.enabled === false || !rule.pattern) return;

    const regex = compileCustomRule(rule.pattern);
    if (!regex) return;

    regex.lastIndex = 0;
    const matches = scanText.match(regex);

    if (matches) {
      const type = "CUSTOM:" + (rule.name || rule.id || "RULE");
      matches.forEach((match) => {
        findings.push({ type, value: match });
      });
    }
  });

  return dedupeFindings(findings);
}
