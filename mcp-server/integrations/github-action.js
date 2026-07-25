/**
 * Maskit GitHub Action Integration
 * Scans pull request diffs for sensitive data.
 *
 * Usage in .github/workflows/scan.yml:
 *   - name: Scan for secrets
 *     run: node mcp-server/integrations/github-action.js
 */

const { execSync } = require("child_process");
const path = require("path");

const CLI = path.join(__dirname, "..", "cli.js");

function getDiff() {
    try {
        return execSync("git diff --cached --diff-filter=ACM", { encoding: "utf8" });
    } catch {
        return "";
    }
}

function main() {
    const diff = getDiff();
    if (!diff) {
        console.log("No staged changes to scan.");
        process.exit(0);
    }

    console.log("Scanning staged changes for sensitive data...\n");

    const result = execSync(
        `node "${CLI}" --json scan "${diff.replace(/"/g, '\\"').slice(0, 10000)}"`,
        { encoding: "utf8" }
    );

    const parsed = JSON.parse(result);

    if (parsed.findings.length === 0) {
        console.log("No sensitive data found in staged changes.");
        process.exit(0);
    }

    console.log("WARNING: Sensitive data found in staged changes!\n");
    parsed.findings.forEach((f) => {
        console.log(`  - ${f.type} [${f.severity}]: ${f.value.slice(0, 30)}...`);
    });
    console.log(`\nRisk score: ${parsed.riskScore} (${parsed.riskLevel})`);
    console.log("\nCommit aborted. Please remove sensitive data before committing.");
    process.exit(1);
}

main();