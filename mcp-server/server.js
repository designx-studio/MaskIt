#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const engine = require("../engine/index");
const config = require("./config");

const TOOLS = [
  ["scan_text", "Scan text for sensitive data.", { text: { type: "string" }, app: { type: "string" } }, ["text"]],
  ["redact_text", "Scan and redact sensitive data.", { text: { type: "string" }, format: { type: "string", enum: ["tagged", "stars", "custom"] }, app: { type: "string" } }, ["text"]],
  ["evaluate_policy", "Evaluate whether text should be allowed, redacted, or blocked.", { text: { type: "string" }, app: { type: "string" } }, ["text"]],
  ["scan_response", "Scan an AI response for leaked secrets.", { response: { type: "string" }, app: { type: "string" } }, ["response"]],
  ["get_status", "Get engine and configuration status.", {}, []],
  ["get_rules", "Get active detection rules.", {}, []],
  ["get_audit_log", "Get recent audit events.", { limit: { type: "number" } }, []]
].map(([name, description, properties, required]) => ({ name, description, inputSchema: { type: "object", properties, required } }));

function result(value, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], ...(isError ? { isError: true } : {}) };
}

function killswitch(settings) {
  const ks = settings.killswitch || { enabled: false };
  if (!ks.enabled) return null;
  if (ks.duration && new Date() >= new Date(ks.duration)) return null;
  return ks.message || "AI tools are restricted by administrator";
}

function settingsFor(app) {
  return config.getSettingsForApp(app);
}

function handle(name, args = {}) {
  const settings = settingsFor(args.app);
  const blocked = killswitch(settings);
  if (blocked && name !== "get_status" && name !== "get_rules" && name !== "get_audit_log") return result({ error: "AI tools are restricted", message: blocked, blocked: true, allowed: false }, true);

  if (name === "scan_text") return result(engine.scanText(args.text, { ...settings, _context: { app: args.app, source: "mcp" } }));
  if (name === "redact_text") return result((() => { const s = { ...settings, _context: { app: args.app, source: "mcp" } }; if (args.format) s.redactFormat = args.format; const r = engine.scanText(args.text, s); return { redactedText: r.redactedText, findings: r.findings, riskScore: r.riskScore, riskLevel: r.riskLevel }; })());
  if (name === "evaluate_policy") return result(engine.evaluatePolicy(args.text, { ...settings, _context: { app: args.app, source: "mcp" } }));
  if (name === "scan_response") { const r = engine.scanText(args.response, { ...settings, _context: { app: args.app, source: "mcp-response" } }); return result({ hasFindings: r.findings.length > 0, findings: r.findings, riskScore: r.riskScore, riskLevel: r.riskLevel, recommendation: r.riskLevel === "critical" ? "warn" : r.riskLevel === "high" ? "review" : "ok" }); }
  if (name === "get_status") return result({ ...engine.getStatus(), configPath: config.getConfigPath(), enabled: settings.enabled !== false, severity: settings.severity || {}, appOverrides: settings.appOverrides || {} });
  if (name === "get_rules") return result(engine.getRules(settings));
  if (name === "get_audit_log") {
    const limit = Math.max(1, Math.min(Number(args.limit) || 50, 500));
    const auditPath = path.join(config.getConfigDir(), "audit.log");
    if (!fs.existsSync(auditPath)) return result({ events: [], total: 0, path: auditPath });
    const events = fs.readFileSync(auditPath, "utf8").split("\n").filter(Boolean).slice(-limit).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
    return result({ events, total: events.length, path: auditPath });
  }
  return result({ error: `Unknown tool: ${name}` }, true);
}

const server = new Server({ name: "maskit-mcp-server", version: "2.4.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
server.setRequestHandler(CallToolRequestSchema, async ({ params }) => { try { return handle(params.name, params.arguments || {}); } catch (error) { return result({ error: error.message }, true); } });
new StdioServerTransport();
(async () => { await server.connect(new StdioServerTransport()); })().catch((error) => { console.error(error); process.exit(1); });
