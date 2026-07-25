#!/usr/bin/env node
/**
 * Maskit CLI
 * Command-line tool for scanning text from scripts and pipelines.
 *
 * Usage:
 *   node mcp-server/cli.js scan "text to scan"
 *   node mcp-server/cli.js scan-file ./file.txt
 *   node mcp-server/cli.js redact "text to redact"
 *   node mcp-server/cli.js risk "text to check"
 */

const fs = require("fs");
const engine = require("../engine/index");
const config = require("./config");

const args = process.argv.slice(2);
const command = args[0];
const input = args.slice(1).join(" ");

function printJson(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

function printCompact(result) {
    if (result.findings.length === 0) {
        console.log("No sensitive data found.");
        return;
    }

    console.log("Found " + result.findings.length + " sensitive item(s):");
    result.findings.forEach((f) => {
        console.log("  - " + f.type + " [" + f.severity + "]: " + f.value.slice(0, 20) + (f.value.length > 20 ? "..." : ""));
    });
    console.log("Risk score: " + result.riskScore + " (" + result.riskLevel + ")");
}

function printRedacted(result) {
    console.log(result.redactedText);
}

function printRisk(result) {
    console.log("Risk score: " + result.riskScore);
    console.log("Risk level: " + result.riskLevel);
    console.log("Findings: " + result.findings.length);
}

function readFile(path) {
    try {
        return fs.readFileSync(path, "utf8");
    } catch (err) {
        console.error("Error reading file: " + err.message);
        process.exit(1);
    }
}

function printUsage() {
    console.log("Maskit CLI — scan and redact sensitive data");
    console.log("");
    console.log("Usage:");
    console.log("  node mcp-server/cli.js scan \"text\"        Scan text for sensitive data");
    console.log("  node mcp-server/cli.js scan-file ./f.txt  Scan a file for sensitive data");
    console.log("  node mcp-server/cli.js redact \"text\"      Redact sensitive data from text");
    console.log("  node mcp-server/cli.js risk \"text\"        Check risk score of text");
    console.log("  node mcp-server/cli.js --json scan \"text\"  Output as JSON");
    console.log("  node mcp-server/cli.js --compact scan \"text\"  Compact output");
}

switch (command) {
    case "scan": {
        if (!input) { console.error("Error: text argument required"); process.exit(1); }
        const result = engine.scanText(input, config.readConfig());
        if (args.includes("--json")) printJson(result);
        else if (args.includes("--compact")) printCompact(result);
        else printCompact(result);
        process.exit(result.findings.length > 0 ? 1 : 0);
    }

    case "scan-file": {
        const filePath = args[1];
        if (!filePath) { console.error("Error: file path required"); process.exit(1); }
        const text = readFile(filePath);
        const result = engine.scanText(text, config.readConfig());
        if (args.includes("--json")) printJson(result);
        else { printCompact(result); }
        if (args.includes("--exit-on-risk") && result.findings.length > 0) process.exit(1);
        break;
    }

    case "redact": {
        if (!input) { console.error("Error: text argument required"); process.exit(1); }
        const result = engine.scanText(input, config.readConfig());
        if (args.includes("--json")) printJson({ redactedText: result.redactedText, findings: result.findings });
        else printRedacted(result);
        break;
    }

    case "risk": {
        if (!input) { console.error("Error: text argument required"); process.exit(1); }
        const result = engine.scanText(input, config.readConfig());
        if (args.includes("--json")) printJson({ riskScore: result.riskScore, riskLevel: result.riskLevel });
        else printRisk(result);
        break;
    }

    default:
        printUsage();
        process.exit(command ? 1 : 0);
}