const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const ENGINE_DEFAULTS = require("../engine/settings").MASKIT_DEFAULTS;

function getConfigDir() {
    if (process.platform === "win32") return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "Maskit");
    if (process.platform === "darwin") return path.join(os.homedir(), "Library", "Application Support", "Maskit");
    return path.join(os.homedir(), ".config", "maskit");
}
function getConfigPath() { return path.join(getConfigDir(), "config.json"); }
function getDefaultConfig() { return Object.assign({}, ENGINE_DEFAULTS, { version: "1.0", severity: { API_KEY: "critical", CARD: "critical", SSN: "critical", BANK_ACCOUNT: "critical", PASSPORT: "high", IP_ADDRESS: "high", EMAIL: "medium", PHONE: "medium", MPESA: "low", CUSTOM: "medium" }, appOverrides: { "claude-desktop": { enabled: true, reviewBeforeRedact: true }, cursor: { enabled: true } } }); }
function readConfig() {
    try { const file = getConfigPath(); if (fs.existsSync(file)) return Object.assign({}, getDefaultConfig(), JSON.parse(fs.readFileSync(file, "utf8"))); }
    catch (err) { console.error("Failed to read config:", err.message); }
    return getDefaultConfig();
}
function writeConfig(value) {
    const dir = getConfigDir(); const file = getConfigPath(); const temp = file + ".tmp";
    try {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
        fs.writeFileSync(temp, JSON.stringify(value, null, 4), { encoding: "utf8", mode: 0o600 });
        fs.renameSync(temp, file);
        if (process.platform !== "win32") { try { fs.chmodSync(dir, 0o700); fs.chmodSync(file, 0o600); } catch { /* best effort on restricted filesystems */ } }
        return { ok: true, path: file };
    } catch (err) { try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch {} return { ok: false, error: err.message }; }
}
function getSettingsForApp(appName) { const config = readConfig(); return Object.assign({}, config, appName && config.appOverrides?.[appName] ? config.appOverrides[appName] : {}); }
function getApiToken() { return readConfig().apiToken || null; }
function setApiToken(token) { return writeConfig(Object.assign(readConfig(), { apiToken: token })); }
function getOrCreateApiToken() { return getApiToken() || (setApiToken(crypto.randomBytes(32).toString("hex")), getApiToken()); }
function getHashSalt() { return readConfig().hashSalt || null; }
function setHashSalt(salt) { return writeConfig(Object.assign(readConfig(), { hashSalt: salt })); }
function getOrCreateHashSalt() { return getHashSalt() || (setHashSalt(crypto.randomBytes(32).toString("hex")), getHashSalt()); }
module.exports = { getConfigDir, getConfigPath, getDefaultConfig, readConfig, writeConfig, getSettingsForApp, getApiToken, setApiToken, getOrCreateApiToken, getHashSalt, setHashSalt, getOrCreateHashSalt };
