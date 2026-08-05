/**
 * Maskit Shared Engine — Detection & Sanitization
 * Single runtime rule consumer for Node/MCP/CLI.
 * Rules load from maskit-core/rules via rule-loader (same source as browser + Windows).
 */

const {
  REGEX_LIMITS,
  SEVERITY_DEFAULTS,
  SEVERITY_WEIGHTS,
  MASKIT_DEFAULTS,
  validateCustomRegexPattern,
  limitScanText,
  selectPolicy,
  getPolicyAction
} = require('./settings');
const {
  loadRuleBundle,
  ruleVersion,
  enabledTypeForRule,
  findingTypeForRule,
  compileRegex
} = require('./rule-loader');
const { createEventFromFinding, createContextEvent } = require('./context');

const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'];

function getRiskLevel(score) {
  if (score >= 50) return 'critical';
  if (score >= 25) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

function calculateRiskScore(findings, settings) {
  let score = 0;
  const severity = (settings && settings.severity) || SEVERITY_DEFAULTS;
  findings.forEach((f) => {
    const typeBase = f.type.replace(/^CUSTOM:/, '');
    const level = severity[typeBase] || severity.CUSTOM || 'medium';
    score += SEVERITY_WEIGHTS[level] || 10;
  });
  return Math.min(100, score);
}

function luhnCheck(value) {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
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

function validateFinding(type, value, validator) {
  const text = String(value || '');
  const v = validator || 'none';
  if (v === 'luhn' || type === 'CARD') return luhnCheck(text);
  if (v === 'mpesa' || type === 'MPESA') {
    const upper = text.toUpperCase();
    const letters = (upper.match(/[A-Z]/g) || []).length;
    const digits = (upper.match(/[0-9]/g) || []).length;
    if (letters < 2 || digits < 2) return false;
    if (letters > 8 || digits > 8) return false;
    if (/^(.)\1+$/.test(upper)) return false;
    return true;
  }
  if (v === 'passport' || type === 'PASSPORT') {
    return /[A-Z]/.test(text) && /\d/.test(text) && text.length >= 8;
  }
  if (v === 'ip_address' || type === 'IP_ADDRESS') {
    const parts = text.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
    if (parts.every((part) => part < 12)) return false;
    if (parts[0] === 127 || parts.every((part) => part === 0)) return false;
    return true;
  }
  if (v === 'api_key' || type === 'API_KEY') {
    if (/Bearer\s+/i.test(text)) return text.replace(/Bearer\s+/i, '').length >= 20;
    if (/[=:]\s*/.test(text)) return true;
    return text.length >= 20;
  }
  if (v === 'bank_account' || type === 'BANK_ACCOUNT') return text.length >= 15;
  return true;
}

function compileCustomRule(pattern) {
  const validation = validateCustomRegexPattern(pattern);
  if (!validation.ok) return null;
  try {
    return new RegExp(pattern, 'gi');
  } catch {
    return null;
  }
}

const path = require('path');
let workerThreads = null;
try {
  workerThreads = require('worker_threads');
} catch {}

const CUSTOM_RULE_TIMEOUT_MS = 150;

function matchWithTimeout(regexOrPattern, text, timeoutMs = CUSTOM_RULE_TIMEOUT_MS) {
  const pattern = typeof regexOrPattern === 'string' ? regexOrPattern : regexOrPattern.source;
  const flags = typeof regexOrPattern === 'object' && regexOrPattern.flags ? regexOrPattern.flags : 'gi';

  if (workerThreads && workerThreads.Worker) {
    try {
      const { MessageChannel, receiveMessageOnPort } = workerThreads;
      const channel = new MessageChannel();
      const sab = new SharedArrayBuffer(4);
      const int32 = new Int32Array(sab);

      const worker = new workerThreads.Worker(path.join(__dirname, 'regex-worker.js'), {
        workerData: { pattern, flags, text, sab, port: channel.port2 },
        transferList: [channel.port2]
      });

      const waitStatus = Atomics.wait(int32, 0, 0, timeoutMs);

      if (waitStatus === 'timed-out') {
        worker.terminate();
        channel.port1.close();
        console.warn(`MaskIt: Custom rule exceeded ${timeoutMs}ms budget, aborting scan`);
        const empty = [];
        empty.timedOut = true;
        return empty;
      }

      const item = receiveMessageOnPort(channel.port1);
      worker.terminate();
      channel.port1.close();

      if (!item || !item.message || !item.message.ok) {
        return [];
      }
      const matches = item.message.matches || [];
      matches.timedOut = false;
      return matches;
    } catch (err) {
      console.warn("MaskIt: Worker execution failed, falling back to same-thread match:", err.message);
    }
  }

  // Fallback for non-Node environments / browser
  const CUSTOM_RULE_MAX_SCAN_LENGTH = 2000;
  const scanText = text.length > CUSTOM_RULE_MAX_SCAN_LENGTH ? text.slice(0, CUSTOM_RULE_MAX_SCAN_LENGTH) : text;
  const regex = typeof regexOrPattern === 'string' ? new RegExp(regexOrPattern, 'gi') : regexOrPattern;
  const start = Date.now();
  regex.lastIndex = 0;
  const matches = [];
  let match;
  let timedOut = false;
  while ((match = regex.exec(scanText)) !== null) {
    matches.push(match[0]);
    if (Date.now() - start > timeoutMs) {
      console.warn(`MaskIt: Custom rule exceeded ${timeoutMs}ms budget, aborting scan`);
      timedOut = true;
      break;
    }
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }
  matches.timedOut = timedOut;
  return matches;
}

function dedupeFindings(findings) {
  const seen = new Set();
  return findings.filter((item) => {
    const key = item.type + ':' + item.value;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectSensitiveData(text, settings) {
  const findings = [];
  const scanText = limitScanText(text);
  const rules = loadRuleBundle();

  rules.forEach((rule) => {
    const enabledType = enabledTypeForRule(rule);
    if (settings[enabledType] === false) return;
    const regex = compileRegex(rule);
    if (!regex) return;
    regex.lastIndex = 0;
    const matches = scanText.match(regex) || [];
    const findingType = findingTypeForRule(rule);
    matches.forEach((match) => {
      if (!validateFinding(findingType, match, rule.validator)) return;
      findings.push({
        type: findingType,
        value: match,
        severity: rule.severity || (SEVERITY_DEFAULTS[findingType] || 'medium'),
        confidence: rule.confidence || 0.85,
        ruleName: rule.id
      });
    });
  });

  (settings.customRules || []).forEach((rule) => {
    if (!rule || rule.enabled === false || !rule.pattern) return;
    const regex = compileCustomRule(rule.pattern);
    if (!regex) return;
    const matches = matchWithTimeout(regex, scanText);
    const timedOut = matches.timedOut;
    matches.forEach((match) => {
      findings.push({
        type: 'CUSTOM:' + (rule.name || rule.id || 'RULE'),
        value: match,
        severity: (settings.severity || SEVERITY_DEFAULTS).CUSTOM || 'medium',
        ruleName: rule.name || rule.id || 'RULE',
        timedOut
      });
    });
  });

  return dedupeFindings(findings);
}

function getRedactionText(type, settings) {
  const format = (settings && settings.redactFormat) || 'tagged';
  if (format === 'stars') return '***';
  if (format === 'custom') return (settings && settings.customRedactText) || '[REDACTED]';
  const label = String(type).replace(/^CUSTOM:/, '');
  return '[' + label + '_REDACTED]';
}

function sanitizeText(text, findings, settings) {
  const config = settings || {};
  let sanitized = text;
  findings.forEach((item) => {
    sanitized = sanitized.replaceAll(item.value, getRedactionText(item.type, config));
  });
  return sanitized;
}

function applyPolicyToFindings(findings, context, settings) {
  const policy = selectPolicy(context, settings);
  return findings.map((f) => {
    const typeBase = f.type.replace(/^CUSTOM:/, '');
    const action = getPolicyAction(policy, typeBase, f.ruleName);
    return {
      finding: f,
      action,
      format: (policy[typeBase] && policy[typeBase].format) || undefined
    };
  });
}

function scanText(textOrContext, settings) {
  const isObjectContext = textOrContext && typeof textOrContext === 'object' && !Array.isArray(textOrContext);
  const text = isObjectContext ? (textOrContext.content || '') : String(textOrContext || '');
  const mergedSettings = Object.assign({}, MASKIT_DEFAULTS, settings || {});
  
  let context = (settings && settings._context) || {};
  if (isObjectContext) {
    const { content, ...restContext } = textOrContext;
    context = Object.assign({}, context, restContext);
  }

  const findings = detectSensitiveData(text, mergedSettings);
  const riskScore = calculateRiskScore(findings, mergedSettings);
  const riskLevel = getRiskLevel(riskScore);
  const policyDecisions = applyPolicyToFindings(findings, context, settings);

  const actionableFindings = policyDecisions
    .filter((d) => d.action !== 'allow')
    .map((d) => d.finding);

  const redactedText = sanitizeText(text, actionableFindings, mergedSettings);
  const matchedRules = findings.map((f) => f.type);

  // Canonical events only — never legacy audit objects
  const events = policyDecisions.map((d) =>
    createEventFromFinding({
      finding: d.finding,
      decision: d,
      context,
      riskScore,
      settings: mergedSettings
    })
  );

  return {
    findings: actionableFindings,
    allFindings: findings,
    policyDecisions,
    redactedText,
    riskScore,
    riskLevel,
    matchedRules,
    events,
    ruleVersion: ruleVersion()
  };
}

function redactText(textOrContext, settings) {
  const isObjectContext = textOrContext && typeof textOrContext === 'object' && !Array.isArray(textOrContext);
  const text = isObjectContext ? (textOrContext.content || '') : String(textOrContext || '');
  const mergedSettings = Object.assign({}, MASKIT_DEFAULTS, settings || {});
  
  let context = (settings && settings._context) || {};
  if (isObjectContext) {
    const { content, ...restContext } = textOrContext;
    context = Object.assign({}, context, restContext);
  }

  const findings = detectSensitiveData(text, mergedSettings);
  const policyDecisions = applyPolicyToFindings(findings, context, settings);
  const actionableFindings = policyDecisions
    .filter((d) => d.action !== 'allow')
    .map((d) => d.finding);
  return {
    redactedText: sanitizeText(text, actionableFindings, mergedSettings),
    findings: actionableFindings,
    allFindings: findings
  };
}

function evaluatePolicy(textOrContext, settings) {
  const result = scanText(textOrContext, settings);
  const blocked = result.policyDecisions.filter((d) => d.action === 'block');
  const allowed = result.policyDecisions.filter((d) => d.action === 'allow');
  const redacted = result.policyDecisions.filter((d) => d.action === 'redact');
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
    reason: result.policyDecisions.length
      ? `Found ${result.allFindings.length} sensitive item(s): ${blocked.length} blocked, ${redacted.length} redacted, ${allowed.length} allowed`
      : 'No sensitive data detected'
  };
}

function getRules(settings) {
  const rules = loadRuleBundle().map((rule) => {
    const type = findingTypeForRule(rule);
    return {
      id: rule.id,
      type,
      enabled: (settings || {})[enabledTypeForRule(rule)] !== false,
      severity: rule.severity || SEVERITY_DEFAULTS[type] || 'medium'
    };
  });
  return {
    rules,
    customRules: ((settings || {}).customRules || []).map((r) => ({
      id: r.id,
      name: r.name,
      pattern: r.pattern,
      enabled: r.enabled !== false
    })),
    ruleVersion: ruleVersion()
  };
}

function updateRules(newCustomRules, settings) {
  const updated = Object.assign({}, settings || {});
  updated.customRules = (newCustomRules || [])
    .filter((r) => {
      if (!r || !r.pattern) return false;
      return validateCustomRegexPattern(r.pattern).ok;
    })
    .slice(0, REGEX_LIMITS.maxCustomRules);
  return updated;
}

function getStatus() {
  const rules = loadRuleBundle();
  return {
    version: '2.4.0',
    engineReady: true,
    rulesEnabled: rules.length,
    ruleVersion: ruleVersion()
  };
}

// Legacy pattern export shape for any remaining consumers (derived from shared rules)
function getPatternsMap() {
  const map = {};
  loadRuleBundle().forEach((rule) => {
    if (rule.id.startsWith('API_KEY')) return;
    const regex = compileRegex(rule);
    if (regex) {
      map[rule.id] = regex;
    }
  });
  return map;
}

function getApiKeyPatterns() {
  return loadRuleBundle()
    .filter((rule) => rule.id.startsWith('API_KEY'))
    .map((rule) => compileRegex(rule))
    .filter(Boolean);
}

module.exports = {
  get patterns() {
    return getPatternsMap();
  },
  get API_KEY_PATTERNS() {
    return getApiKeyPatterns();
  },
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
  getStatus,
  createContextEvent,
  createEventFromFinding
};
