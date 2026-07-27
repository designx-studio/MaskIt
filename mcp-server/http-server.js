#!/usr/bin/env node
/**
 * Maskit HTTP Server
 * Serves the website and provides API endpoints for custom integrations.
 * Starts on localhost:8765 by default.
 *
 * Security: Bearer token authentication, CORS restrictions, body size limit, rate limiting.
 *
 * Website: GET /           — Landing page
 *          GET /styles.css — Styles
 *          GET /demo.html  — Demo page
 *
 * API (requires Authorization: Bearer <token>):
 *   POST /scan      — scan text for sensitive data
 *   POST /redact    — scan and redact text
 *   POST /policy    — evaluate policy for text
 *   GET  /status    — engine status
 *   GET  /rules     — list active rules
 *   GET  /health    — health check (no auth required)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const engine = require("../engine/index");
const config = require("./config");

const PORT = parseInt(process.env.MASKIT_PORT, 10) || 8765;
const WEBSITE_DIR = path.resolve(__dirname, "..", "website");
const ROOT_DIR = path.resolve(__dirname, "..");

// ── Security constants ──────────────────────────────────────────────────────

const MAX_BODY_SIZE = 1024 * 1024; // 1MB
const RATE_LIMIT_WINDOW = 60000;   // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

// ── API token (generated on first start, stored in config) ──────────────────

const API_TOKEN = config.getOrCreateApiToken();

// ── Rate limiting state ─────────────────────────────────────────────────────

const requestCounts = new Map();

function checkRateLimit(token) {
    const now = Date.now();
    if (!requestCounts.has(token)) {
        requestCounts.set(token, { count: 0, resetAt: now + RATE_LIMIT_WINDOW });
    }

    const entry = requestCounts.get(token);

    // Reset window if expired
    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + RATE_LIMIT_WINDOW;
    }

    // Check limit
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    entry.count++;
    return true;
}

// ── MIME types ───────────────────────────────────────────────────────────────

const MIME_TYPES = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".md": "text/markdown"
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        let size = 0;

        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                req.destroy();
                reject(new Error("Request body too large (max 1MB)"));
                return;
            }
            body += chunk;
        });

        req.on("end", () => {
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error("Invalid JSON: " + err.message));
            }
        });

        req.on("error", (err) => {
            reject(new Error("Request error: " + err.message));
        });
    });
}

function sendJson(res, data, status) {
    res.writeHead(status || 200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
}

function sendAuthError(res, message) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: message || "Unauthorized. Use: Authorization: Bearer <token>" }));
}

function sendRateLimitError(res) {
    res.writeHead(429, {
        "Content-Type": "application/json",
        "Retry-After": "60"
    });
    res.end(JSON.stringify({ error: "Rate limited. Max " + RATE_LIMIT_MAX_REQUESTS + " requests per minute." }));
}

function serveFile(res, filePath) {
    try {
        const content = fs.readFileSync(filePath);
        const ext = path.extname(filePath);
        const mime = MIME_TYPES[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": mime });
        res.end(content);
    } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
    }
}

function isAuthenticated(req) {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace(/^Bearer\s+/, "");
    return !!(token && token === API_TOKEN);
}

// ── Server ──────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const pathname = url.pathname;

    // Set security headers on all responses
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Access-Control-Allow-Origin", "null");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    try {
        // ── Static file serving (website — no auth required) ────────────────

        if (req.method === "GET" && pathname === "/") {
            return serveFile(res, path.join(WEBSITE_DIR, "index.html"));
        }

        if (req.method === "GET" && pathname === "/styles.css") {
            return serveFile(res, path.join(WEBSITE_DIR, "styles.css"));
        }

        if (req.method === "GET" && pathname === "/demo.html") {
            return serveFile(res, path.join(WEBSITE_DIR, "demo.html"));
        }

        if (req.method === "GET" && pathname.startsWith("/icons/")) {
            const iconPath = path.join(ROOT_DIR, pathname);
            // Prevent path traversal
            const resolved = path.resolve(iconPath);
            if (!resolved.startsWith(ROOT_DIR)) {
                res.writeHead(403, { "Content-Type": "text/plain" });
                return res.end("Forbidden");
            }
            return serveFile(res, iconPath);
        }

        // ── Health check (no auth required) ────────────────────────────────

        if (req.method === "GET" && pathname === "/health") {
            const engineStatus = engine.getStatus();
            return sendJson(res, {
                status: "ok",
                version: engineStatus.version,
                uptime: Math.round(process.uptime()),
                timestamp: new Date().toISOString()
            });
        }

        // ── API endpoints (auth required) ─────────────────────────────────

        if (pathname === "/scan" || pathname === "/redact" || pathname === "/policy" ||
            pathname === "/status" || pathname === "/rules") {
            // Authentication check
            if (!isAuthenticated(req)) {
                return sendAuthError(res);
            }

            // Rate limit check
            const authHeader = req.headers["authorization"] || "";
            const token = authHeader.replace(/^Bearer\s+/, "");
            if (!checkRateLimit(token)) {
                return sendRateLimitError(res);
            }
        }

        // GET /status
        if (req.method === "GET" && pathname === "/status") {
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
        if (req.method === "GET" && pathname === "/rules") {
            const settings = config.readConfig();
            const rules = engine.getRules(settings);
            return sendJson(res, rules);
        }

        // POST /scan
        if (req.method === "POST" && pathname === "/scan") {
            let body;
            try {
                body = await parseBody(req);
            } catch (err) {
                return sendJson(res, { error: err.message }, 400);
            }
            if (!body || typeof body.text !== "string") {
                return sendJson(res, { error: "Missing or invalid 'text' field" }, 400);
            }
            const settings = config.getSettingsForApp(body.app);
            const result = engine.scanText(body.text, settings);
            return sendJson(res, result);
        }

        // POST /redact
        if (req.method === "POST" && pathname === "/redact") {
            let body;
            try {
                body = await parseBody(req);
            } catch (err) {
                return sendJson(res, { error: err.message }, 400);
            }
            if (!body || typeof body.text !== "string") {
                return sendJson(res, { error: "Missing or invalid 'text' field" }, 400);
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
        if (req.method === "POST" && pathname === "/policy") {
            let body;
            try {
                body = await parseBody(req);
            } catch (err) {
                return sendJson(res, { error: err.message }, 400);
            }
            if (!body || typeof body.text !== "string") {
                return sendJson(res, { error: "Missing or invalid 'text' field" }, 400);
            }
            const settings = config.getSettingsForApp(body.app);
            const result = engine.evaluatePolicy(body.text, settings);
            return sendJson(res, result);
        }

        // 404
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));

    } catch (err) {
        sendJson(res, { error: err.message }, 500);
    }
});

server.listen(PORT, "127.0.0.1", () => {
    console.log("Maskit server running on http://127.0.0.1:" + PORT);
    console.log("Website: http://127.0.0.1:" + PORT + "/");
    console.log("API: POST /scan, POST /redact, POST /policy, GET /status, GET /rules");
    console.log("API token: " + API_TOKEN);
    console.log('Example: curl -H "Authorization: Bearer ' + API_TOKEN + '" http://127.0.0.1:' + PORT + '/scan -d \'{"text":"test"}\'');
});