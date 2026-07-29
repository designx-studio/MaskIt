const assert = require("assert");
const fs = require("fs");
const path = require("path");
const engine = require("../../engine");

console.log("Running policy-engine.test.js...");

// 1. Schema Validation Tests
{
  const validPolicy = {
    version: "1.0",
    mode: "strict",
    actions: {
      aws_keys: "block",
      github_tokens: "block",
      customer_data: "redact"
    }
  };
  assert.ok(engine.validatePolicy(validPolicy).ok);

  const invalidPolicyNoVersion = {
    mode: "strict",
    actions: {}
  };
  assert.strictEqual(engine.validatePolicy(invalidPolicyNoVersion).ok, false);

  const invalidPolicyBadMode = {
    version: "1.0",
    mode: "invalid_mode"
  };
  assert.strictEqual(engine.validatePolicy(invalidPolicyBadMode).ok, false);
}

// 2. Local Policy Hot Reload and Evaluation Tests
{
  const testPolicyFile = path.resolve(__dirname, "policy_temp.json");
  const tempPolicy = {
    version: "2.0",
    mode: "strict",
    actions: {
      aws_keys: "block",
      github_tokens: "redact",
      customer_data: "allow"
    }
  };

  fs.writeFileSync(testPolicyFile, JSON.stringify(tempPolicy, null, 2), "utf8");

  try {
    const loadSuccess = engine.loadPolicyFile(testPolicyFile);
    assert.ok(loadSuccess, "Failed to load policy file");
    
    const active = engine.getActiveLocalPolicy();
    assert.strictEqual(active.version, "2.0");

    // Evaluate matching actions under this policy
    const context = { source: "cli", app: "test" };

    // aws_keys should be blocked
    const awsResult = engine.scanText("const key = 'AKIAIOSFODNN7EXAMPLE';", { _context: context });
    assert.ok(awsResult.policyDecisions.some(d => d.action === "block"), "aws_keys should block");

    // github_tokens should be redacted
    const ghResult = engine.scanText("const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123456';", { _context: context });
    assert.ok(ghResult.policyDecisions.some(d => d.action === "redact"), "github_tokens should redact");

    // customer_data (email) should be allowed
    const emailResult = engine.scanText("My email is test@example.com", { _context: context });
    assert.ok(emailResult.policyDecisions.every(d => d.action === "allow"), "customer_data should allow");

  } finally {
    try { fs.unlinkSync(testPolicyFile); } catch {}
    engine.setLocalPolicy(null); // Clear local policy state
  }
}

// 3. Strict mode default actions check
{
  const strictPolicy = {
    version: "3.0",
    mode: "strict",
    actions: {
      aws_keys: "block"
      // github_tokens action not defined! Under strict mode, it should default to block!
    }
  };
  
  engine.setLocalPolicy(strictPolicy);
  try {
    const ghResult = engine.scanText("const token = 'ghp_1234567890abcdefghijklmnopqrstuvwxyz123456';");
    assert.ok(ghResult.policyDecisions.some(d => d.action === "block"), "Undefined rule action under strict mode should block");
  } finally {
    engine.setLocalPolicy(null);
  }
}

console.log("policy-engine.test.js passed!");
