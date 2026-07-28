/**
 * Validate regex patterns in Maskit rule files and hardcoded detectors for ReDoS safety.
 */
const fs = require("fs");
const path = require("path");
const safeRegex = require("safe-regex");

const RULE_FILES = [
    path.join(__dirname, "..", "maskit-core", "rules", "pii.json"),
    path.join(__dirname, "..", "maskit-core", "rules", "secrets.json"),
    path.join(__dirname, "..", "maskit-core", "rules", "financial.json"),
];
const DETECTOR_FILES = [
    path.join(__dirname, "..", "detector.js"),
    path.join(__dirname, "..", "engine", "detector.js")
];

let failed = false;

for (const file of RULE_FILES) {
    if (!fs.existsSync(file)) { console.error(`MISSING: ${file}`); failed = true; continue; }
    let data;
    try { data = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch (e) { console.error(`PARSE_ERROR: ${file}: ${e.message}`); failed = true; continue; }
    for (const rule of data.rules || []) {
        if (!rule.pattern) continue;
        if (!safeRegex(rule.pattern)) { console.error(`REDOS_RISK: ${path.basename(file)} / ${rule.id} (${rule.name}): ${rule.pattern}`); failed = true; }
        else console.log(`OK: ${path.basename(file)} / ${rule.id}`);
    }
}

for (const file of DETECTOR_FILES) {
    if (!fs.existsSync(file)) { console.error(`MISSING: ${file}`); failed = true; continue; }
    const source = fs.readFileSync(file, "utf8");
    const regexLiterals = [...source.matchAll(/\/((?:\\.|[^/\\])+)\/([gimsuy]*)/g)];
    for (const match of regexLiterals) {
        const pattern = match[1];
        if (!pattern || pattern.startsWith("/") || pattern.includes("\\n")) continue;
        try {
            if (!safeRegex(pattern)) { console.error(`REDOS_RISK: ${path.relative(process.cwd(), file)}: /${pattern}/${match[2]}`); failed = true; }
        } catch (e) { console.error(`REGEX_PARSE_ERROR: ${file}: /${pattern}/: ${e.message}`); failed = true; }
    }
}

if (failed) { console.error("\nFAIL: One or more regex patterns are vulnerable to ReDoS."); process.exit(1); }
console.log("\nPASS: All regex patterns are safe or covered.");
process.exit(0);
