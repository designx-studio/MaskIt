const assert = require("assert");
const fs = require("fs");
const path = require("path");

// 1. Setup VS Code API Mock in Node's require cache
const mockVscode = {
  workspace: {
    name: "test-workspace",
    getConfiguration: () => ({
      get: (key) => true
    })
  },
  window: {
    showInformationMessage: () => {},
    showWarningMessage: () => {},
    showErrorMessage: () => {}
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1
  },
  Range: class {
    constructor(start, end) {
      this.start = start;
      this.end = end;
    }
  },
  Position: class {
    constructor(line, character) {
      this.line = line;
      this.character = character;
    }
  }
};

const Module = require('module');
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'vscode') {
    return mockVscode;
  }
  return originalLoad.apply(this, arguments);
};

// 2. Import compiled extension modules
const scanner = require("../../maskit-vscode/out/scanner");
const context = require("../../maskit-vscode/out/context");

// 3. Run Tests

// Test 1: Context creation schema matching
{
  const text = "Some clean code here";
  const result = scanner.scanText(text, "typescript");
  
  assert.ok(result.findings, "should return findings array");
  assert.strictEqual(result.findings.length, 0, "clean code should have 0 findings");
  assert.strictEqual(result.allowed, true, "clean code should be allowed");
}

// Test 2: Secrets detection using maskit-core
{
  // AWS Access Key
  const awsText = 'const awsKey = "AKIAIOSFODNN7EXAMPLE";';
  const awsResult = scanner.scanText(awsText, "javascript");
  assert.ok(awsResult.findings.some(f => f.type === "API_KEY_AWS_ACCESS"), "should detect AWS Access Key");

  // GitHub Token
  const githubText = 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz123456";';
  const githubResult = scanner.scanText(githubText, "typescript");
  assert.ok(githubResult.findings.some(f => f.type === "API_KEY_GITHUB"), "should detect GitHub Token");

  // OpenAI API Key
  const openaiText = 'const key = "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz";';
  const openaiResult = scanner.scanText(openaiText, "typescript");
  assert.ok(openaiResult.findings.some(f => f.type === "API_KEY_OPENAI"), "should detect OpenAI Key");

  // Anthropic API Key
  const anthropicText = 'const key = "sk-ant-api03-1234567890abcdefghijklmnopqrstuvwxyz";';
  const anthropicResult = scanner.scanText(anthropicText, "typescript");
  assert.ok(anthropicResult.findings.some(f => f.type === "API_KEY_ANTHROPIC" || f.type === "API_KEY_OPENAI"), "should detect Anthropic Key");

  // Azure Connection String
  const azureText = 'const conn = "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=abcdefghijklmnopqrstuvwxyz1234567890abcdefghijkl=;";';
  const azureResult = scanner.scanText(azureText, "typescript");
  assert.ok(azureResult.findings.some(f => f.type === "API_KEY_AZURE_CONN"), "should detect Azure Connection String");
}

// Test 3: Canonical evidence logging
{
  const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
  const logPath = path.join(appData, "Maskit", "audit.jsonl");

  // Backup log if it exists
  let logBackup = null;
  if (fs.existsSync(logPath)) {
    logBackup = fs.readFileSync(logPath, "utf8");
    fs.truncateSync(logPath);
  }

  try {
    context.logEvidenceEvent({
      type: "AWS_ACCESS_KEY",
      severity: "critical",
      action: "blocked",
      value: "AKIAIOSFODNN7EXAMPLE"
    });

    assert.ok(fs.existsSync(logPath), "evidence file should be written");
    
    const lines = fs.readFileSync(logPath, "utf8").trim().split("\n");
    assert.strictEqual(lines.length, 1, "should log exactly one event");

    const parsed = JSON.parse(lines[0]);
    
    // Validate schema
    assert.strictEqual(parsed.schemaVersion, "1.0");
    assert.strictEqual(parsed.source, "ide");
    assert.strictEqual(parsed.application, "vscode");
    assert.strictEqual(parsed.dataType, "AWS_ACCESS_KEY");
    assert.strictEqual(parsed.action, "blocked");
    assert.strictEqual(parsed.policy.result, "blocked");
    
    // Ensure no raw secret is stored
    assert.ok(!parsed.value, "raw value must NOT be logged");
    assert.ok(!JSON.stringify(parsed).includes("AKIAIOSFODNN7EXAMPLE"), "raw secret must NOT be part of log content");
    assert.ok(parsed.matchedValueHash, "should log hashed representation");

  } finally {
    // Restore backup
    if (logBackup !== null) {
      fs.writeFileSync(logPath, logBackup);
    } else {
      try { fs.unlinkSync(logPath); } catch {}
    }
  }
}

console.log("VS Code extension integration tests passed!");
