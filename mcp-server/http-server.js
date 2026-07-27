#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const engine = require("../engine/index");
const config = require("./config");

const PORT = parseInt(process.env.MASKIT_PORT, 10) || 8765;
const WEBSITE_DIR = path.resolve(__dirname, "..", "website");
const ROOT_DIR = path.resolve(__dirname, "..");
const MAX_BODY_SIZE = 1024 * 1024;
const MAX_SCAN_LENGTH = engine.REGEX_LIMITS.maxScanLength;
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const API_TOKEN = config.getOrCreateApiToken();
const requestCounts = new Map();

function checkRateLimit(token) {
    const now = Date.now();
    const entry = requestCounts.get(token);
    if (!entry || now >= entry.resetAt) {
        requestCounts.set(token, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        for (const [key, value] of requestCounts) if (now >= value.resetAt) requestCounts.delete(key);
        return true;
    }
    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) return false;
    entry.count++;
    return true;
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        let size = 0;
        req.on("data", (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_SIZE) {
                reject(new Error("Request body too large (max 1MB)"));
                req.destroy();
                return;
            }
            body += chunk;
        });
        req.on("end", () => {
            try { resolve(JSON.parse(body)); } catch (err) { reject(new Error("Invalid JSON: " + err.message)); }
        });
        req.on("error", (err) => reject(new Error("Request error: " + err.message)));
    });
}

function sendJson(res, data, status = 200) {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
}
function sendAuthError(res) { sendJson(res, { error: "Unauthorized" }, 401); }
function sendRateLimitError(res) { res.setHeader("Retry-After", "60"); sendJson(res, { error: "Rate limited" }, 429); }
function serveFile(res, filePath) {
    try { res.writeHead(200, { "Content-Type": { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8" }[path.extname(filePath)] || "application/octet-stream" }); res.end(fs.readFileSync(filePath)); }
    catch { sendJson(res, { error: "Not found" }, 404); }
}
function isAuthenticated(req) {
    const header = req.headers.authorization || "";
    const match = /^Bearer\s+([^\s]+)$/i.exec(header);
    if (!match) return false;
    const presented = Buffer.from(match[1]);
    const expected = Buffer.from(API_TOKEN);
    return presented.length === expected.length && crypto.timingSafeEqual(presented, expected);
}
function validateText(body) {
    if (!body || typeof body.text !== "string" || !body.text.trim()) return "Missing or invalid 'text' field";
    if (body.text.length > MAX_SCAN_LENGTH) return `Text exceeds the ${MAX_SCAN_LENGTH} character limit`;
    return null;
}
function getSettings(body) { const settings = config.getSettingsForApp(body.app); if (body.format !== undefined) { if (!["tagged", "stars", "custom"].includes(body.format)) throw new Error("Invalid format"); settings.redactFormat = body.format; } return settings; }

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    const pathname = url.pathname;
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Security-Policy", "default-src 'self'; object-src 'none'; frame-ancestors 'none'");
    res.setHeader("Access-Control-Allow-Origin", "null");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    try {
        if (req.method === "GET" && pathname === "/") return serveFile(res, path.join(WEBSITE_DIR, "index.html"));
        if (req.method === "GET" && pathname === "/styles.css") return serveFile(res, path.join(WEBSITE_DIR, "styles.css"));
        if (req.method === "GET" && pathname === "/demo.html") return serveFile(res, path.join(WEBSITE_DIR, "demo.html"));
        if (req.method === "GET" && pathname.startsWith("/icons/")) { const file = path.resolve(ROOT_DIR, "." + pathname); if (!file.startsWith(path.join(ROOT_DIR, "icons" + path.sep))) return sendJson(res, { error: "Forbidden" }, 403); return serveFile(res, file); }
        if (req.method === "GET" && pathname === "/health") return sendJson(res, { status: "ok", version: engine.getStatus().version, uptime: Math.round(process.uptime()) });
        if (["/scan", "/redact", "/policy", "/status", "/rules"].includes(pathname)) { if (!isAuthenticated(req)) return sendAuthError(res); const token = req.headers.authorization.slice(7).trim(); if (!checkRateLimit(token)) return sendRateLimitError(res); }
        if (req.method === "GET" && pathname === "/status") return sendJson(res, { ...engine.getStatus(), configPath: config.getConfigPath(), port: PORT });
        if (req.method === "GET" && pathname === "/rules") return sendJson(res, engine.getRules(config.readConfig()));
        if (req.method === "POST" && ["/scan", "/redact", "/policy"].includes(pathname)) {
            const body = await parseBody(req); const validationError = validateText(body); if (validationError) return sendJson(res, { error: validationError }, 400); const settings = getSettings(body); const context = { app: body.app || "unknown", source: "http" };
            if (pathname === "/policy") return sendJson(res, engine.evaluatePolicy(body.text, { ...settings, _context: context }));
            const result = engine.scanText(body.text, { ...settings, _context: context });
            if (pathname === "/redact") return sendJson(res, { ...result, redactedText: result.redactedText });
            return sendJson(res, result);
        }
        return sendJson(res, { error: "Not found" }, 404);
    } catch (err) { return sendJson(res, { error: err.message }, 500); }
});

server.listen(PORT, "127.0.0.1", () => console.log("Maskit server listening on loopback port " + PORT));
