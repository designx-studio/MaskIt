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
        name: "update_rules",
        description: "Update custom detection rules. Replaces all custom rules with the provided list.",
        inputSchema: {
            type: "object",
            properties: {
                customRules: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            id: { type: "string" },
                            name: { type: "string" },
                            pattern: { type: "string" },
                            enabled: { type: "boolean" }
                        },
                        required: ["name", "pattern"]
                    },
                    description: "Array of custom rules to set"
                }
            },
            required: ["customRules"]
        }
    }
];

// ── Tool handlers ───────────────────────────────────────────────────────────

function handleScanText(args) {
    const settings = config.getSettingsForApp(args.app);
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

function handleUpdateRules(args) {
    const settings = config.readConfig();
    const updated = engine.updateRules(args.customRules, settings);

    const writeResult = config.writeConfig(Object.assign({}, settings, {
        customRules: updated.customRules
    }));

    return {
        content: [{
            type: "text",
            text: JSON.stringify({
                ok: writeResult.ok,
                customRules: updated.customRules,
                error: writeResult.error || undefined
            }, null, 2)
        }]
    };
}

// ── Server setup ────────────────────────────────────────────────────────────

const server = new Server(
    {
        name: "maskit-mcp-server",
        version: "1.0.0"
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
            case "update_rules":
                return handleUpdateRules(args || {});
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