const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RULE_DIR = path.join(ROOT, 'maskit-core', 'rules');
const RULE_FILES = ['pii.json', 'financial.json', 'secrets.json'];

let cachedBundle = null;
let cachedVersions = null;
let cachedRegexMap = new Map();

function compileRegex(rule) {
  const key = `${rule.pattern}|${rule.flags || 'g'}`;
  if (cachedRegexMap.has(key)) {
    return cachedRegexMap.get(key);
  }
  try {
    const regex = new RegExp(rule.pattern, rule.flags || 'g');
    cachedRegexMap.set(key, regex);
    return regex;
  } catch {
    return null;
  }
}

function loadRuleBundle(forceReload = false) {
  if (cachedBundle && !forceReload) return cachedBundle;
  const rules = RULE_FILES.flatMap((file) => {
    const full = path.join(RULE_DIR, file);
    if (!fs.existsSync(full)) throw new Error(`Missing rule file: ${full}`);
    const parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
    return parsed.rules || [];
  });
  cachedBundle = rules;
  cachedVersions = RULE_FILES.map((file) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(RULE_DIR, file), 'utf8'));
    return parsed.version || '0';
  });
  return cachedBundle;
}

function ruleVersion() {
  if (!cachedVersions) loadRuleBundle();
  return [...new Set(cachedVersions)].join(',');
}

function enabledTypeForRule(rule) {
  const id = String(rule.id || '');
  if (id.startsWith('API_KEY')) return 'API_KEY';
  return id;
}

function findingTypeForRule(rule) {
  const id = String(rule.id || '');
  if (id.startsWith('API_KEY')) return 'API_KEY';
  return id;
}

function clearRuleCache() {
  cachedBundle = null;
  cachedVersions = null;
  cachedRegexMap.clear();
}

function getRuleDir() {
  return RULE_DIR;
}

module.exports = {
  RULE_FILES,
  loadRuleBundle,
  ruleVersion,
  enabledTypeForRule,
  findingTypeForRule,
  clearRuleCache,
  getRuleDir,
  compileRegex
};
