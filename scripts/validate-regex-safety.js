/**
 * Validate regex patterns in Maskit shared rule files for ReDoS safety.
 * Detectors load rules from maskit-core — they are not independent pattern sources.
 */
const fs = require("fs");
const path = require("path");
const safeRegex = require("safe-regex");

const RULE_FILES = [
  path.join(__dirname, "..", "maskit-core", "rules", "pii.json"),
  path.join(__dirname, "..", "maskit-core", "rules", "secrets.json"),
  path.join(__dirname, "..", "maskit-core", "rules", "financial.json")
];

let failed = false;

for (const file of RULE_FILES) {
  if (!fs.existsSync(file)) {
    console.error(`MISSING: ${file}`);
    failed = true;
    continue;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`PARSE_ERROR: ${file}: ${e.message}`);
    failed = true;
    continue;
  }
  for (const rule of data.rules || []) {
    if (!rule.pattern) continue;
    if (!safeRegex(rule.pattern)) {
      console.error(`REDOS_RISK: ${path.basename(file)} / ${rule.id} (${rule.name}): ${rule.pattern}`);
      failed = true;
    } else {
      console.log(`OK: ${path.basename(file)} / ${rule.id}`);
    }
  }
}

if (failed) {
  console.error("\nFAIL: One or more regex patterns are vulnerable to ReDoS.");
  process.exit(1);
}
console.log("\nPASS: All shared rule regex patterns are safe.");
process.exit(0);
