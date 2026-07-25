/**
 * Maskit Discord Bot Integration
 * Scans messages for sensitive data before they are sent.
 *
 * Usage:
 *   This is a template — adapt to your Discord bot framework.
 *   Works with discord.js or similar libraries.
 */

const engine = require("../../engine/index");
const config = require("../config");

/**
 * Scan a Discord message for sensitive data.
 * Call this before sending messages to channels.
 *
 * @param {string} messageText - The message to scan
 * @param {object} [appConfig] - Optional app-specific config
 * @returns {{ allowed: boolean, findings: Array, redactedText: string }}
 */
function scanDiscordMessage(messageText, appConfig) {
    const settings = config.getSettingsForApp("discord");
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
 * Example Discord.js integration:
 *
 *   const { Client, GatewayIntentBits } = require('discord.js');
 *   const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
 *
 *   client.on('messageCreate', (message) => {
 *     if (message.author.bot) return;
 *
 *     const scan = scanDiscordMessage(message.content);
 *     if (!scan.allowed) {
 *       message.reply(`Warning: Your message contains sensitive data (${scan.findings.length} item(s)). Message blocked.`);
 *       return;
 *     }
 *   });
 *
 *   client.login(process.env.DISCORD_TOKEN);
 */

module.exports = { scanDiscordMessage };