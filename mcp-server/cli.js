#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const engine = require("../engine/index");
const { simulatePolicy } = require("../engine/simulation");
const config = require("./config");
const args = process.argv.slice(2);
const json = args.includes("--json");
const command = args[0];
const positional = args.slice(1).filter((arg) => !arg.startsWith("--"));
const input = positional.join(" ");
function print(value) { console.log(JSON.stringify(value, null, 2)); }
function compact(result) {
  if (!result.findings.length) { console.log("No sensitive data found."); return; }
  console.log(`Found ${result.findings.length} sensitive item(s):`);
  result.findings.forEach((f) => console.log(`  - ${f.type} [${f.severity}]: ${f.value.slice(0, 20)}${f.value.length > 20 ? "..." : ""}`));
  console.log(`Risk score: ${result.riskScore} (${result.riskLevel})`);
}
function readFile(filePath) {
  try { return fs.readFileSync(filePath, "utf8"); }
  catch (error) { console.error(`Error reading file: ${error.message}`); process.exit(1); }
}
function usage() {
  console.log("Maskit CLI");
  console.log("  scan <text> [--json]");
  console.log("  scan-file <path> [--json] [--exit-on-risk]");
  console.log("  redact <text> [--json]");
  console.log("  risk <text> [--json]");
  console.log("  simulate <text> [--json]   Evaluate policy without audit mutation");
}
function requireInput() { if (!input) { console.error("Error: text argument required"); process.exit(1); } }
switch (command) {
  case "scan": {
    requireInput(); const result = engine.scanText(input, config.readConfig());
    if (json) print(result); else compact(result);
    process.exitCode = result.findings.length ? 1 : 0; break;
  }
  case "scan-file": {
    const filePath = positional[0]; if (!filePath) { console.error("Error: file path required"); process.exit(1); }
    const result = engine.scanText(readFile(filePath), config.readConfig());
    if (json) print(result); else compact(result);
    if (args.includes("--exit-on-risk") && result.findings.length) process.exitCode = 1;
    break;
  }
  case "redact": {
    requireInput(); const result = engine.scanText(input, config.readConfig());
    if (json) print({ redactedText: result.redactedText, findings: result.findings }); else console.log(result.redactedText);
    break;
  }
  case "risk": {
    requireInput(); const result = engine.scanText(input, config.readConfig());
    if (json) print({ riskScore: result.riskScore, riskLevel: result.riskLevel }); else console.log(`Risk score: ${result.riskScore}\nRisk level: ${result.riskLevel}\nFindings: ${result.findings.length}`);
    break;
  }
  case "simulate": {
    requireInput();
    const result = simulatePolicy(engine, input, { ...config.readConfig(), _context: { source: "cli", app: "simulation" } });
    if (json) print(result); else {
      console.log(`Simulation only: audit mutated = ${result.mutated}`);
      console.log(`Risk: ${result.riskScore} (${result.riskLevel})`);
      result.explanations.forEach((item) => console.log(`${item.type}: ${item.explanation} Confidence ${item.confidence}`));
      console.log(result.redactedText);
    }
    break;
  }
  default: usage(); process.exitCode = command ? 1 : 0;
}
