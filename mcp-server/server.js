#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const engine = require("../engine/index");
const config = require("./config");
const TOOLS = [
  ["scan_text", "Scan text for sensitive data.", { text: { type: "string", minLength: 1 }, app: { type: "string" } }, ["text"]],
  ["redact_text", "Scan and redact sensitive data.", { text: { type: "string", minLength: 1 }, format: { type: "string", enum: ["tagged", "stars", "custom"] }, app: { type: "string" } }, ["text"]],
  ["evaluate_policy", "Evaluate whether text should be allowed, redacted, or blocked.", { text: { type: "string", minLength: 1 }, app: { type: "string" } }, ["text"]],
  ["scan_response", "Scan an AI response for leaked secrets.", { response: { type: "string", minLength: 1 }, app: { type: "string" } }, ["response"]],
  ["get_status", "Get engine and configuration status.", {}, []], ["get_rules", "Get active detection rules.", {}, []], ["get_audit_log", "Get recent audit events.", { limit: { type: "number", minimum: 1, maximum: 500 } }, []]
].map(([name, description, properties, required]) => ({ name, description, inputSchema: { type: "object", properties, required } }));
function result(value, isError = false) { return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) }; }
function requireText(value, field) { if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a non-empty string`); return value; }
function validateArgs(name, args) { if (["scan_text", "redact_text", "evaluate_policy"].includes(name)) requireText(args.text, "text"); if (name === "scan_response") requireText(args.response, "response"); if (args.format && !["tagged", "stars", "custom"].includes(args.format)) throw new Error("format must be tagged, stars, or custom"); }
function persistEvents(events) {
  if (!events?.length) return;
  const file = path.join(config.getConfigDir(), "audit.log");
  const backup = file + ".1";
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > 10 * 1024 * 1024) { // FIXED: D3 — rotate audit.log before it exceeds storage limits
      if (fs.existsSync(backup)) fs.unlinkSync(backup);
      fs.renameSync(file, backup);
    }
  } catch { }
  fs.appendFileSync(file, events.map(e => JSON.stringify(e)).join("\n") + "\n", "utf8");
}
function killswitch(settings) { const ks = settings.killswitch || { enabled: false }; if (!ks.enabled) return null; if (ks.duration && new Date() >= new Date(ks.duration)) return null; return ks.message || "AI tools are restricted by administrator"; }
function commonScan(text, settings, context) { const scan = engine.scanText(text, { ...settings, _context: context }); persistEvents(scan.events); return scan; }
function response(scan, extra = {}) { return { findings: scan.findings, allFindings: scan.allFindings, policyDecisions: scan.policyDecisions, redactedText: scan.redactedText, riskScore: scan.riskScore, riskLevel: scan.riskLevel, matchedRules: scan.matchedRules, events: scan.events, ...extra }; }
function handle(name, args = {}) {
  validateArgs(name, args); const settings = config.getSettingsForApp(args.app); const blocked = killswitch(settings);
  if (blocked && !["get_status", "get_rules", "get_audit_log"].includes(name)) return result({ error: "AI tools are restricted", message: blocked, blocked: true, allowed: false }, true);
  const context = { app: args.app || "unknown", source: "mcp" };
  if (name === "scan_text") return result(response(commonScan(args.text, settings, context)));
  if (name === "redact_text") { const scan = commonScan(args.text, { ...settings, ...(args.format ? { redactFormat: args.format } : {}) }, context); return result(response(scan)); }
  if (name === "evaluate_policy") { const scan = commonScan(args.text, settings, context); return result(response(scan, { allowed: !scan.policyDecisions.some(d => d.action === "block"), blocked: scan.policyDecisions.filter(d => d.action === "block").length, redacted: scan.policyDecisions.filter(d => d.action === "redact").length, allowedByPolicy: scan.policyDecisions.filter(d => d.action === "allow").length })); }
  if (name === "scan_response") { const scan = commonScan(args.response, settings, { ...context, source: "mcp-response" }); return result(response(scan, { hasFindings: scan.findings.length > 0, recommendation: scan.riskLevel === "critical" ? "warn" : scan.riskLevel === "high" ? "review" : "ok" })); }
  if (name === "get_status") return result({ ...engine.getStatus(), configPath: config.getConfigPath(), enabled: settings.enabled !== false, severity: settings.severity || {}, appOverrides: settings.appOverrides || {} });
  if (name === "get_rules") return result(engine.getRules(settings));
  if (name === "get_audit_log") { const limit = Math.max(1, Math.min(Number(args.limit) || 50, 500)); const file = path.join(config.getConfigDir(), "audit.log"); if (!fs.existsSync(file)) return result({ events: [], total: 0 }); const events = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).slice(-limit).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } }); return result({ events, total: events.length }); }
  return result({ error: `Unknown tool: ${name}` }, true);
}
function createServer() { const server = new Server({ name: "maskit-mcp-server", version: "2.4.0" }, { capabilities: { tools: {} } }); server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS })); server.setRequestHandler(CallToolRequestSchema, async ({ params }) => { try { return handle(params.name, params.arguments || {}); } catch (error) { return result({ error: error.message }, true); } }); return server; }
async function main() { await createServer().connect(new StdioServerTransport()); }
if (require.main === "module") main().catch(error => { console.error(error); process.exit(1); });
module.exports = { TOOLS, handle, createServer };
