const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const ENGINE_DEFAULTS = require("../engine/settings").MASKIT_DEFAULTS;
function getConfigDir() { const platform = process.platform; if (platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Maskit"); if (platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "Maskit"); return path.join(os.homedir(), ".config", "maskit"); }
function getConfigPath() { return path.join(getConfigDir(), "config.json"); }
function getDefaultConfig() { return Object.assign({}, ENGINE_DEFAULTS, { version: "1.0", severity: { API_KEY: "critical", CARD: "critical", SSN: "critical", BANK_ACCOUNT: "critical", PASSPORT: "high", IP_ADDRESS: "high", EMAIL: "medium", PHONE: "medium", MPESA: "low", CUSTOM: "medium" }, appOverrides: { "claude-desktop": { enabled: true, reviewBeforeRedact: true }, "cursor": { enabled: true } } }); }
function readConfig() { const configPath = getConfigPath(); try { if (fs.existsSync(configPath)) return Object.assign({}, getDefaultConfig(), JSON.parse(fs.readFileSync(configPath, "utf8"))); } catch (err) { console.error("Failed to read config:", err.message); } return getDefaultConfig(); }
function writeConfig(config) { const configDir = getConfigDir(); const configPath = getConfigPath(); try { fs.mkdirSync(configDir, { recursive: true }); fs.writeFileSync(configPath, JSON.stringify(config, null, 4), "utf8"); return { ok: true, path: configPath }; } catch (err) { return { ok: false, error: err.message }; } }
function getSettingsForApp(appName) { const config = readConfig(); const base = Object.assign({}, config); if (appName && config.appOverrides && config.appOverrides[appName]) Object.assign(base, config.appOverrides[appName]); return base; }
function getApiToken() { return readConfig().apiToken || null; }
function setApiToken(token) { const config = readConfig(); config.apiToken = token; writeConfig(config); }
function getOrCreateApiToken() { let token = getApiToken(); if (!token) { token = crypto.randomBytes(32).toString("hex"); setApiToken(token); } return token; }
function getHashSalt() { // FIXED: D4 — prefer an externally supplied salt before reading config.json
    if (process.env.MASKIT_HASH_SALT) return process.env.MASKIT_HASH_SALT;
    const config = readConfig();
    return config.hashSalt || null;
}
function setHashSalt(salt) { const config = readConfig(); config.hashSalt = salt; writeConfig(config); }
function getOrCreateHashSalt() { let salt = getHashSalt(); if (!salt) { salt = crypto.randomBytes(32).toString("hex"); console.log("Advisory: set MASKIT_HASH_SALT env var to move salt out of config.json"); setHashSalt(salt); } return salt; }
module.exports = { getConfigDir, getConfigPath, getDefaultConfig, readConfig, writeConfig, getSettingsForApp, getApiToken, setApiToken, getOrCreateApiToken, getHashSalt, setHashSalt, getOrCreateHashSalt };
