#!/usr/bin/env node
/**
 * Maskit MCP Server
 * Stdio-based MCP server for Claude Desktop and MCP-capable IDEs.
 * Uses the shared Maskit detection engine.
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema
} = require("@modelcontextprotocol/sdk/types.js");

const engine = require("../engine/index");
const config = require("./config");

// ── Tool definitions ────────────────────────────────────────────────────────

const TOOLS = [
    {
        name: "scan_text",
        description: "Scan text for sensitive data. Returns findings with risk score, matched rules, and redacted text.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "The text to scan for sensitive data" },
                app: { type: "string", description: "App context (e.g. 'claude-desktop', 'cursor')" }
            },
            required: ["text"]
        }
    },
    {
        name: "redact_text",
        description: "Scan and redact sensitive data from text. Returns the redacted version.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "The text to redact" },
                format: { type: "string", description: "Redaction format: 'tagged', 'stars', or 'custom'", enum: ["tagged", "stars", "custom"] },
                app: { type: "string", description: "App context (e.g. 'claude-desktop', 'cursor')" }
            },
            required: ["text"]
        }
    },
    {
        name: "evaluate_policy",
        description: "Evaluate whether text contains sensitive data and should be blocked or allowed.",
        inputSchema: {
            type: "object",
            properties: {
                text: { type: "string", description: "The text to evaluate against policy" },
                app: { type: "string", description: "App context (e.g. 'claude-desktop', 'cursor')" }
            },
            required: ["text"]
        }
    },
    {
        name: "scan_response",
        description: "Scan an AI response for potential credential leaks, reconstructed secrets, or leaked API keys. Use after receiving responses from AI models to detect accidental exposure.",
        inputSchema: {
            type: "object",
            properties: {
                response: { type: "string", description: "The AI response text to scan for leaked secrets" },
                app: { type: "string", description: "App context (e.g. 'claude-desktop', 'cursor')" }
            },
            required: ["response"]
        }
    },
    {
        name: "get_status",
        description: "Get Maskit engine status and configuration info.",
        inputSchema: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "get_rules",
        description: "Get all active detection rules and custom rules.",
        inputSchema: {
            type: "object",
            properties: {},
            required: []
        }
    },
    {
        name: "get_audit_log",
        description: "Get recent audit log events from the MCP server's audit log. Returns the last 50 events by default.",
        inputSchema: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Maximum number of events to return (default: 50)" }
            },
            required: []
        }
    }
];

// ── Tool handlers ───────────────────────────────────────────────────────────

function checkKillswitch(settings) {
    const ks = settings.killswitch || { enabled: false };
    if (!ks.enabled) return null;

    const now = new Date();

    // Check schedule
    if (ks.schedule) {
        const hour = now.getHours();
        const minute = now.getMinutes();
        const day = now.getDay();
        const currentMinutes = hour * 60 + minute;

        const disableParts = (ks.schedule.disable || "").split(":");
        const enableParts = (ks.schedule.enable || "").split(":");
        const disableTime = disableParts.length === 2 ? parseInt(disableParts[0], 10) * 60 + parseInt(disableParts[1], 10) : null;
        const enableTime = enableParts.length === 2 ? parseInt(enableParts[0], 10) * 60 + parseInt(enableParts[1], 10) : null;
        const daysOfWeek = ks.schedule.daysOfWeek || [1, 2, 3, 4, 5];

        if (daysOfWeek.includes(day) && disableTime !== null && enableTime !== null) {
            let restricted = false;
            if (disableTime > enableTime) {
                restricted = currentMinutes >= disableTime || currentMinutes < enableTime;
            } else {
                restricted = currentMinutes >= disableTime && currentMinutes < enableTime;
            }
            if (restricted) {
                return { blocked: true, reason: "AI tools disabled by schedule" };
            }
        }
        return null;
    }

    // Check time-limited
    if (ks.duration) {
        if (now < new Date(ks.duration)) {
            return { blocked: true, reason: ks.message || "AI tools restricted" };
        }
        return null;
    }

    // Indefinite killswitch
    return { blocked: true, reason: ks.message || "AI tools restricted by administrator" };
}

function handleScanText(args) {
    const settings = config.getSettingsForApp(args.app);
    const ksCheck = checkKillswitch(settings);
    if (ksCheck) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    error: "AI tools are restricted",
                    message: ksCheck.reason,
                    blocked: true
                }, null, 2)
            }],
            isError: true
        };
    }
    const result = engine.scanText(args.text, settings);
    return {
        content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
        }]
    };
}

function handleRedactText(args) {
    const settings = config.getSettingsForApp(args.app);
    const ksCheck = checkKillswitch(settings);
    if (ksCheck) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    error: "AI tools are restricted",
                    message: ksCheck.reason,
                    blocked: true
                }, null, 2)
            }],
            isError: true
        };
    }
    if (args.format) {
        settings.redactFormat = args.format;
    }
    const result = engine.scanText(args.text, settings);
    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                redactedText: result.redactedText,
                findings: result.findings,
                riskScore: result.riskScore,
                riskLevel: result.riskLevel
            }, null, 2)
        }]
    };
}

function handleEvaluatePolicy(args) {
    const settings = config.getSettingsForApp(args.app);
    const ksCheck = checkKillswitch(settings);
    if (ksCheck) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    error: "AI tools are restricted",
                    message: ksCheck.reason,
                    blocked: true,
                    allowed: false
                }, null, 2)
            }],
            isError: true
        };
    }
    const result = engine.evaluatePolicy(args.text, settings);
    return {
        content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
        }]
    };
}

function handleGetStatus() {
    const engineStatus = engine.getStatus();
    const configPath = config.getConfigPath();
    const configData = config.readConfig();

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                version: engineStatus.version,
                engineReady: engineStatus.engineReady,
                configPath: configPath,
                rulesEnabled: engineStatus.rulesEnabled,
                enabled: configData.enabled !== false,
                severity: configData.severity || {},
                appOverrides: configData.appOverrides || {}
            }, null, 2)
        }]
    };
}

function handleGetRules() {
    const settings = config.readConfig();
    const rules = engine.getRules(settings);
    return {
        content: [{
            type: "text",
            text: JSON.stringify(rules, null, 2)
        }]
    };
}

function handleGetAuditLog(args) {
    const limit = args.limit || 50;
    const auditLogPath = path.join(config.getConfigDir(), "audit.log");

    try {
        if (!fs.existsSync(auditLogPath)) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({ events: [], total: 0, path: auditLogPath })
                }]
            };
        }

        const lines = fs.readFileSync(auditLogPath, "utf8").split("\n").filter((line) => line.trim());
        const events = [];

        // Read last N events (from end of file)
        const start = Math.max(0, lines.length - limit);
        for (let i = start; i < lines.length; i++) {
            try {
                const evt = JSON.parse(lines[i]);
                events.push(evt);
            } catch { }
        }

        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    events: events,
                    total: events.length,
                    path: auditLogPath
                }, null, 2)
            }]
        };
    } catch (err) {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({ error: err.message, path: auditLogPath })
            }],
            isError: true
        };
    }
}

function handleScanResponse(args) {
    const settings = config.getSettingsForApp(args.app);
    const result = engine.scanText(args.response, settings);

    const hasFindings = result.findings.length > 0;
    const criticalFindings = result.findings.filter(function (f) {
        return f.severity === "critical";
    });

    let recommendation = "ok";
    if (criticalFindings.length > 0) {
        recommendation = "warn";
    } else if (result.riskScore > 50) {
        recommendation = "warn";
    } else if (result.riskScore > 25) {
        recommendation = "review";
    }

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                hasFindings: hasFindings,
                findings: result.findings,
                riskScore: result.riskScore,
                riskLevel: result.riskLevel,
                recommendation: recommendation,
                message: hasFindings
                    ? "Response contains potential secrets: " + result.findings.length + " finding(s). " +
                    (recommendation === "warn" ? "WARNING: Critical credentials detected — check before copying." : "Review recommended.")
                    : "No sensitive data detected in response."
            }, null, 2)
        }]
    };
}

// ── Server setup ────────────────────────────────────────────────────────────

const server = new Server(
    {
        name: "maskit-mcp-server",
        version: "2.4.0"
    },
    {
        capabilities: {
            tools: {}
        }
    }
);

// ── List tools handler ──────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});

// ── Call tool handler ───────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "scan_text":
                return handleScanText(args || {});
            case "redact_text":
                return handleRedactText(args || {});
            case "evaluate_policy":
                return handleEvaluatePolicy(args || {});
            case "get_status":
                return handleGetStatus();
            case "get_rules":
                return handleGetRules();
            case "get_audit_log":
                return handleGetAuditLog(args || {});
            case "scan_response":
                return handleScanResponse(args || {});
            default:
                return {
                    content: [{ type: "text", text: "Unknown tool: " + name }],
                    isError: true
                };
        }
    } catch (err) {
        return {
            content: [{ type: "text", text: "Error: " + err.message }],
            isError: true
        };
    }
});

// ── Start server ────────────────────────────────────────────────────────────

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Maskit MCP server running on stdio");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});