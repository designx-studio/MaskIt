const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
assert.deepStrictEqual(manifest.host_permissions, [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://claude.ai/*",
  "https://gemini.google.com/*",
  "https://copilot.microsoft.com/*",
  "https://*.cursor.com/*"
]);
assert.ok(!JSON.stringify(manifest).toLowerCase().includes("gmail"));

const context = { console, RegExp, String, Object, Array, Set, Math, Date };
vm.createContext(context);
vm.runInContext(fs.readFileSync("settings.js", "utf8"), context);
assert.ok(context.MASKIT_SUPPORTED_SITES.every((site) => !site.includes("google.com/*") || site.includes("gemini")));
assert.strictEqual(context.isSiteAllowed(context.MASKIT_DEFAULTS, "mail.google.com"), true);

const engine = require("./engine/index");
const result = engine.scanText("Send sk-proj-abcdefghijklmnopqrstuvwxyz1234 to john@example.com", context.MASKIT_DEFAULTS);
assert.ok(result.allFindings.some((finding) => finding.type === "API_KEY"));
assert.ok(result.allFindings.some((finding) => finding.type === "EMAIL"));
assert.ok(result.redactedText.includes("REDACTED") || result.redactedText.includes("***"));

console.log("AI scope tests passed");
