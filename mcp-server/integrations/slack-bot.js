/**
 * Maskit Slack Bot Integration
 * Scans messages for sensitive data before they are posted.
 *
 * Usage:
 *   This is a template — adapt to your Slack bot framework.
 *   Works with @slack/bolt or similar libraries.
 */

const engine = require("../../engine/index");
const config = require("../config");

/**
 * Scan a Slack message for sensitive data.
 * Call this before posting messages to channels.
 *
 * @param {string} messageText - The message to scan
 * @param {object} [appConfig] - Optional app-specific config
 * @returns {{ allowed: boolean, findings: Array, redactedText: string }}
 */
function scanSlackMessage(messageText, appConfig) {
    const settings = config.getSettingsForApp("slack");
    if (appConfig) Object.assign(settings, appConfig);

    const result = engine.scanText(messageText, settings);

    return {
        allowed: result.findings.length === 0,
        findings: result.findings,
        redactedText: result.redactedText,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel
    };
}

/**
 * Example Slack Bolt integration:
 *
 *   const { App } = require('@slack/bolt');
 *   const app = new App({ token: process.env.SLACK_BOT_TOKEN, signingSecret: process.env.SLACK_SIGNING_SECRET });
 *
 *   app.message(async ({ message, say }) => {
 *     const scan = scanSlackMessage(message.text);
 *     if (!scan.allowed) {
 *       await say(`Warning: Your message contains sensitive data (${scan.findings.length} item(s)). Please remove it and try again.`);
 *       return;
 *     }
 *   });
 *
 *   app.start(3000);
 */

module.exports = { scanSlackMessage };