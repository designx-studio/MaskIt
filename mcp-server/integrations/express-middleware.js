/**
 * Maskit Express.js Middleware
 * Scans request bodies for sensitive data before processing.
 *
 * Usage:
 *   const maskitScan = require('./mcp-server/integrations/express-middleware');
 *   app.use('/api/chat', maskitScan, chatHandler);
 */

const engine = require("../../engine/index");
const config = require("../config");

/**
 * Express middleware that scans request bodies for sensitive data.
 * If findings are detected, blocks the request with a warning.
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next
 */
function maskitScan(req, res, next) {
    if (!req.body) {
        return next();
    }

    const text = typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body);

    if (!text) {
        return next();
    }

    const settings = config.readConfig();
    const result = engine.evaluatePolicy(text, settings);

    if (result.findings.length === 0) {
        return next();
    }

    // Attach findings to request for downstream use
    req.maskit = {
        findings: result.findings,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel,
        allowed: result.allowed
    };

    if (!result.allowed) {
        return res.status(400).json({
            error: "Sensitive data detected in request",
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            findings: result.findings.map((f) => ({
                type: f.type,
                severity: f.severity
            }))
        });
    }

    // Policy allows (review mode) — continue but attach findings
    next();
}

module.exports = maskitScan;