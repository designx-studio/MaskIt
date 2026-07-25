/**
 * Maskit MCP Server — Config File Management
 * Reads/writes JSON config at OS-specific well-known location.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const ENGINE_DEFAULTS = require("../engine/settings").MASKIT_DEFAULTS;

// ── Config file location ────────────────────────────────────────────────────

function getConfigDir() {
    const platform = process.platform;

    if (platform === "win32") {
        return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Maskit");
    }
    if (platform === "darwin") {
        return path.join(os.homedir(), "Library", "Application Support", "Maskit");
    }
    return path.join(os.homedir(), ".config", "maskit");
}

function getConfigPath() {
    return path.join(getConfigDir(), "config.json");
}

// ── Default config ──────────────────────────────────────────────────────────

function getDefaultConfig() {
    return Object.assign({}, ENGINE_DEFAULTS, {
        version: "1.0",
        severity: {
            API_KEY: "critical",
            CARD: "critical",
            SSN: "critical",
            BANK_ACCOUNT: "critical",
            PASSPORT: "high",
            IP_ADDRESS: "high",
            EMAIL: "medium",
            PHONE: "medium",
            MPESA: "low",
            CUSTOM: "medium"
        },
        appOverrides: {
            "claude-desktop": { enabled: true, reviewBeforeRedact: true },
            "cursor": { enabled: true }
        }
    });
}

// ── Read config ─────────────────────────────────────────────────────────────

function readConfig() {
    const configPath = getConfigPath();

    try {
        if (fs.existsSync(configPath)) {
            const raw = fs.readFileSync(configPath, "utf8");
            const parsed = JSON.parse(raw);
            return Object.assign({}, getDefaultConfig(), parsed);
        }
    } catch (err) {
        console.error("Failed to read config:", err.message);
    }

    return getDefaultConfig();
}

// ── Write config ────────────────────────────────────────────────────────────

function writeConfig(config) {
    const configDir = getConfigDir();
    const configPath = getConfigPath();

    try {
        fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4), "utf8");
        return { ok: true, path: configPath };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ── Get settings for specific app ───────────────────────────────────────────

function getSettingsForApp(appName) {
    const config = readConfig();
    const base = Object.assign({}, config);

    if (appName && config.appOverrides && config.appOverrides[appName]) {
        Object.assign(base, config.appOverrides[appName]);
    }

    return base;
}

module.exports = {
    getConfigDir,
    getConfigPath,
    getDefaultConfig,
    readConfig,
    writeConfig,
    getSettingsForApp
};