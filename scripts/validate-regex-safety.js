/**
 * Validate all regex patterns in maskit-core rule files for ReDoS safety.
 * Fails if any pattern is flagged by safe-regex.
 *
 * Usage: node scripts/validate-regex-safety.js
 */

const fs = require("fs");
const path = require("path");
const safeRegex = require("safe-regex");

const RULE_FILES = [
    path.join(__dirname, "..", "maskit-core", "rules", "pii.json"),
    path.join(__dirname, "..", "maskit-core", "rules", "secrets.json"),
    path.join(__dirname, "..", "maskit-core", "rules", "financial.json"),
];

let failed = false;

for (const file of RULE_FILES) {
    if (!fs.existsSync(file)) {
        console.error(`MISSING: ${file}`);
        failed = true;
        continue;
    }

    const raw = fs.readFileSync(file, "utf8");
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        console.error(`PARSE_ERROR: ${file}: ${e.message}`);
        failed = true;
        continue;
    }

    const rules = data.rules || [];
    for (const rule of rules) {
        const pattern = rule.pattern;
        if (!pattern) continue;

        // safe-regex returns true if the regex is safe, false if it's dangerous
        const isSafe = safeRegex(pattern);
        if (!isSafe) {
            console.error(`REDOS_RISK: ${path.basename(file)} / ${rule.id} (${rule.name}): ${pattern}`);
            failed = true;
        } else {
            console.log(`OK: ${path.basename(file)} / ${rule.id}`);
        }
    }
}

if (failed) {
    console.error("\nFAIL: One or more regex patterns are vulnerable to ReDoS.");
    process.exit(1);
} else {
    console.log("\nPASS: All regex patterns are safe.");
    process.exit(0);
}