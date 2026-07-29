const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadBrowserCore(hostname) {
  const context = {
    console, RegExp, String, Object, Array, Set, Math, Date, Number, Boolean, JSON, Error,
    parseInt, parseFloat, isNaN, Infinity, undefined,
    location: { hostname },
    window: {},
    document: {}
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../settings.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../browser-rules.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../context-event.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../detector.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../sanitizer.js"), "utf8"), context);
  return context;
}

// Test 1: File scan and event generation consistency
{
  const browser = loadBrowserCore("chatgpt.com");
  const defaults = vm.runInContext("MASKIT_DEFAULTS", browser);
  const content = "Please review this document. It has my email secret@company.com and secret key sk-abcdefghijklmnopqrstuvwxyz1234";
  
  // Detect sensitive data in text content (as FileReader would extract)
  const findings = browser.detectSensitiveData(content, defaults);
  assert.ok(findings.some(f => f.type === "EMAIL"));
  assert.ok(findings.some(f => f.type === "API_KEY"));
  
  // Verify policy selection and action selection in content script settings
  const selectPolicy = vm.runInContext("selectPolicy", browser);
  const getPolicyAction = vm.runInContext("getPolicyAction", browser);
  
  const policy = selectPolicy({ app: "chatgpt.com" }, defaults);
  assert.ok(policy, "expected policy to be resolved");
  
  // Default action for email and api_key is redact
  assert.strictEqual(getPolicyAction(policy, "EMAIL"), "redact");
  assert.strictEqual(getPolicyAction(policy, "API_KEY"), "redact");
  // Default action for card number is block
  assert.strictEqual(getPolicyAction(policy, "CARD"), "block");
  
  // Verify context event creation for files
  const createEventFromFinding = vm.runInContext("createEventFromFinding", browser);
  const fileEvent = createEventFromFinding({
    finding: findings.find(f => f.type === "EMAIL"),
    decision: { action: "redact" },
    context: {
      source: "browser_file",
      app: "chatgpt.com",
      domain: "chatgpt.com",
      contentType: "text/plain",
      metadata: {
        filename: "notes.txt",
        size: content.length
      }
    },
    settings: defaults
  });
  
  assert.strictEqual(fileEvent.source, "browser"); // normalized
  assert.strictEqual(fileEvent.application, "chatgpt.com");
  assert.strictEqual(fileEvent.contentType, "text/plain");
  assert.deepStrictEqual(fileEvent.metadata, { filename: "notes.txt", size: content.length });
  assert.strictEqual(fileEvent.dataType, "EMAIL");
  assert.ok(fileEvent.matchedValueHash, "expected hash to be generated");
  assert.ok(!fileEvent.value, "raw value must NOT be logged");
}

console.log("File context and schema validation tests passed!");
