const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const RULE_DIR = path.join(ROOT, 'maskit-core', 'rules');
function loadRuleBundle() {
  const files = ['pii.json', 'financial.json', 'secrets.json'];
  return files.flatMap((file) => JSON.parse(fs.readFileSync(path.join(RULE_DIR, file), 'utf8')).rules || []);
}
function ruleVersion() {
  const versions = ['pii.json', 'financial.json', 'secrets.json'].map((file) => JSON.parse(fs.readFileSync(path.join(RULE_DIR, file), 'utf8')).version);
  return [...new Set(versions)].join(',');
}
module.exports = { loadRuleBundle, ruleVersion };
