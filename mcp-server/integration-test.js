const assert = require("assert");
const { TOOLS, handle } = require("./server");

assert.deepStrictEqual(TOOLS.map((tool) => tool.name), ["scan_text", "redact_text", "evaluate_policy", "scan_response", "get_status", "get_rules", "get_audit_log"]);
for (const [name, args] of [
  ["scan_text", { text: "Contact john@example.com", app: "claude.ai" }],
  ["redact_text", { text: "Contact john@example.com", format: "tagged", app: "claude.ai" }],
  ["evaluate_policy", { text: "SSN 123-45-6789", app: "claude.ai" }],
  ["scan_response", { response: "Token sk-proj-abcdefghijklmnopqrstuvwxyz1234", app: "claude.ai" }],
  ["get_status", {}],
  ["get_rules", {}],
  ["get_audit_log", { limit: 5 }]
]) {
  const response = handle(name, args);
  assert.ok(Array.isArray(response.content), `${name}: missing content`);
  assert.doesNotThrow(() => JSON.parse(response.content[0].text), `${name}: invalid JSON`);
}
assert.throws(() => handle("scan_text", { text: "" }), /non-empty string/);
assert.throws(() => handle("redact_text", { text: "x", format: "bad" }), /format/);
console.log("MCP integration tests passed");
