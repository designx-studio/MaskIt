#!/usr/bin/env node
/**
 * Maskit HTTP Server
 * Local HTTP server for custom integrations (CI/CD, custom apps, scripts).
 * Starts on localhost:8765 by default.
 *
 * Endpoints:
 *   POST /scan      — scan text for sensitive data
 *   POST /redact    — scan and redact text
 *   POST /policy    — evaluate policy for text
 *   GET  /status    — engine status
 *   GET  /rules     — list active rules
 */

const http = require("http");
const engine = require("../engine/index");
const config = require("./config");

const PORT = parseInt(process.env.MASKIT_PORT, 10) || 8765;

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error("Invalid JSON: " + err.message));
            }
        });
        req.on("error", reject);
    });
}

function sendJson(res, data, status) {
    res.writeHead(status || 200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    try {
        // POST /scan
        if (req.method === "POST" && url.pathname === "/scan") {
            const body = await parseBody(req);
            if (!body.text) {
                return sendJson(res, { error: "text is required" }, 400);
            }
            const settings = config.getSettingsForApp(body.app);
            const result = engine.scanText(body.text, settings);
            return sendJson(res, result);
        }

        // POST /redact
        if (req.method === "POST" && url.pathname === "/redact") {
            const body = await parseBody(req);
            if (!body.text) {
                return sendJson(res, { error: "text is required" }, 400);
            }
            const settings = config.getSettingsForApp(body.app);
            if (body.format) settings.redactFormat = body.format;
            const result = engine.scanText(body.text, settings);
            return sendJson(res, {
                redactedText: result.redactedText,
                findings: result.findings,
                riskScore: result.riskScore,
                riskLevel: result.riskLevel
            });
        }

        // POST /policy
        if (req.method === "POST" && url.pathname === "/policy") {
            const body = await parseBody(req);
            if (!body.text) {
                return sendJson(res, { error: "text is required" }, 400);
            }
            const settings = config.getSettingsForApp(body.app);
            const result = engine.evaluatePolicy(body.text, settings);
            return sendJson(res, result);
        }

        // GET /status
        if (req.method === "GET" && url.pathname === "/status") {
            const engineStatus = engine.getStatus();
            return sendJson(res, {
                version: engineStatus.version,
                engineReady: engineStatus.engineReady,
                rulesEnabled: engineStatus.rulesEnabled,
                configPath: config.getConfigPath(),
                port: PORT
            });
        }

        // GET /rules
        if (req.method === "GET" && url.pathname === "/rules") {
            const settings = config.readConfig();
            const rules = engine.getRules(settings);
            return sendJson(res, rules);
        }

        // 404
        sendJson(res, { error: "Not found" }, 404);

    } catch (err) {
        sendJson(res, { error: err.message }, 500);
    }
});

server.listen(PORT, "127.0.0.1", () => {
    console.log("Maskit HTTP server running on http://127.0.0.1:" + PORT);
    console.log("Endpoints: POST /scan, POST /redact, POST /policy, GET /status, GET /rules");
});