importScripts("settings.js", "context-event.js", "background-audit-log.js");
const BADGE_ON_COLOR = "#00b894";
const BADGE_OFF_COLOR = "#5f6368";
const BADGE_PAUSED_COLOR = "#f6b93b";
function getPauseState(callback) { try { chrome.storage.session.get({ paused: false }, (data) => callback(!!(data && data.paused))); } catch { callback(false); } }
function setPauseState(paused, callback) { try { chrome.storage.session.set({ paused }, () => { if (callback) callback(); }); } catch { if (callback) callback(); } }
function broadcastPauseState(paused, tabId) { const msg = { type: "PAUSE_STATE_CHANGED", paused }; if (typeof tabId === "number") { chrome.tabs.sendMessage(tabId, msg, () => { void chrome.runtime.lastError; }); return; } chrome.tabs.query({}, (tabs) => tabs.forEach((tab) => { if (tab.id) chrome.tabs.sendMessage(tab.id, msg, () => { void chrome.runtime.lastError; }); })); }
function recordRedactions(counts, source) { if (!counts || !Object.keys(counts).length) return; getStats((stats) => { const added = Object.values(counts).reduce((sum, count) => sum + count, 0); stats.totalRedactions += added; stats.bySource = stats.bySource || { paste: 0, copy: 0, typing: 0 }; stats.byType = stats.byType || {}; stats.bySource[source] = (stats.bySource[source] || 0) + added; Object.entries(counts).forEach(([type, count]) => { stats.byType[type] = (stats.byType[type] || 0) + count; }); saveStats(stats); updateActionBadge(); }); }
function eventTimestampMs(event) {
  if (!event) return 0;
  if (typeof event.timestamp === "number") return event.timestamp;
  const parsed = Date.parse(event.timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}
function eventIdOf(event) { return event.eventId || event.id || ("evt_" + Date.now()); }
async function computeChainHash(previousHash, eventId, timestamp) {
  const input = (previousHash || "0") + eventId + timestamp;
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function normalizeStoredEvent(event) {
  if (!event) return null;
  if (event.schemaVersion === "1.0" && event.eventId && event.dataType) {
    const cleaned = { ...event };
    delete cleaned.value;
    delete cleaned.matchedValue;
    delete cleaned.unmaskToken;
    delete cleaned.unmaskedAt;
    delete cleaned.unmaskedDuration;
    return cleaned;
  }
  // Migrate legacy event shapes into canonical schema
  return createContextEvent({
    eventId: event.eventId || event.id,
    timestamp: typeof event.timestamp === "number" ? new Date(event.timestamp).toISOString() : event.timestamp,
    source: event.source || "browser",
    application: event.application || event.app || "unknown",
    dataType: event.dataType || event.type || "unknown",
    confidence: typeof event.confidence === "number" ? event.confidence : 0.85,
    risk: event.risk || event.severity || "medium",
    policy: event.policy || { name: event.policyApplied || "default", version: "1", result: event.action === "blocked" ? "block" : event.action === "allowed" ? "allow" : "redact" },
    action: event.action === "blocked" ? "blocked" : event.action === "allowed" ? "allowed" : "redacted",
    explanation: event.explanation || `${event.type || event.dataType || "Rule"} matched; policy applied.`,
    ruleId: event.ruleId || event.matchedRule || event.type,
    matchedValueHash: event.matchedValueHash || event.unmaskToken || undefined
  });
}

// Audit log batching configuration
const AUDIT_FLUSH_INTERVAL_MS = 2000;
const AUDIT_FLUSH_COUNT_THRESHOLD = 10;
let _pendingAuditEvents = [];
let _auditFlushTimer = null;

async function flushPendingAuditEvents() {
  if (_pendingAuditEvents.length === 0) return;
  
  const eventsToFlush = [..._pendingAuditEvents];
  _pendingAuditEvents = [];
  
  if (_auditFlushTimer) {
    clearTimeout(_auditFlushTimer);
    _auditFlushTimer = null;
  }
  
  getAuditLog(async (auditLog) => {
    const existing = auditLog.events || [];
    for (const raw of eventsToFlush) {
      const event = normalizeStoredEvent(raw);
      if (!event) continue;
      const previousHash = existing.length > 0 ? existing[existing.length - 1].chainHash : null;
      event.chainHash = await computeChainHash(previousHash, eventIdOf(event), event.timestamp);
      existing.push(event);
    }
    const cutoff = Date.now() - (auditLog.retentionDays || 30) * 24 * 60 * 60 * 1000;
    auditLog.events = existing.filter((e) => eventTimestampMs(e) >= cutoff);
    saveAuditLog(auditLog);
  });
}

function scheduleAuditFlush() {
  if (_auditFlushTimer) return;
  _auditFlushTimer = setTimeout(() => {
    _auditFlushTimer = null;
    flushPendingAuditEvents();
  }, AUDIT_FLUSH_INTERVAL_MS);
}

function recordAuditEvents(events) {
  if (!events || !events.length) return;
  _pendingAuditEvents.push(...events);
  
  if (_pendingAuditEvents.length >= AUDIT_FLUSH_COUNT_THRESHOLD) {
    flushPendingAuditEvents();
  } else {
    scheduleAuditFlush();
  }
}

// Flush on extension unload
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onSuspend) {
  chrome.runtime.onSuspend.addListener(() => {
    flushPendingAuditEvents();
  });
}
function getPageStatus(settings, url) { if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) return { active: false, hostname: "" }; const hostname = new URL(url).hostname; return { active: settings.enabled !== false && isSiteAllowed(settings, hostname), hostname }; }
function applyBadge(tabId, active, paused) { let text, color, title; if (paused && active) { text = "PSE"; color = BADGE_PAUSED_COLOR; title = "Maskit — paused (data passing through)"; } else if (active) { text = "ON"; color = BADGE_ON_COLOR; title = "Maskit — protecting this page"; } else { text = "OFF"; color = BADGE_OFF_COLOR; title = "Maskit — off on this page"; } if (typeof tabId === "number") { chrome.action.setBadgeText({ tabId, text }); chrome.action.setBadgeBackgroundColor({ tabId, color }); chrome.action.setTitle({ tabId, title }); return; } chrome.action.setBadgeText({ text }); chrome.action.setBadgeBackgroundColor({ color }); chrome.action.setTitle({ title }); }
function updateActionBadge(tabId) { getPauseState((paused) => { chrome.storage.local.get(MASKIT_DEFAULTS, (settings) => { if (typeof tabId === "number") { chrome.tabs.get(tabId, (tab) => { if (chrome.runtime.lastError || !tab) return; const status = getPageStatus(settings, tab.url); applyBadge(tabId, status.active, paused); }); return; } chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { const tab = tabs[0]; if (!tab) { applyBadge(undefined, settings.enabled !== false, paused); return; } const status = getPageStatus(settings, tab.url); applyBadge(tab.id, status.active, paused); }); }); }); }
chrome.runtime.onInstalled.addListener(() => updateActionBadge());
chrome.runtime.onStartup.addListener(() => updateActionBadge());
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local") updateActionBadge(); });
chrome.tabs.onActivated.addListener(({ tabId }) => updateActionBadge(tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => { if (changeInfo.url || changeInfo.status === "complete") updateActionBadge(tabId); });
function validateConfigImport(settings) {
  const errors = []; const validated = {};
  const allowedKeys = ["enabled", "scanPaste", "scanCopy", "scanTyping", "reviewBeforeRedact", "redactFormat", "customRedactText", "siteListMode", "siteList", "EMAIL", "PHONE", "CARD", "MPESA", "SSN", "API_KEY", "IP_ADDRESS", "PASSPORT", "BANK_ACCOUNT", "customRules", "killswitch", "policies", "pauseAutoResume", "pauseAutoResumeSecs", "browserAIProtection", "severity"];
  if (typeof settings !== "object" || settings === null) return { valid: false, errors: ["Settings must be an object"], settings: {} };
  for (const [key, value] of Object.entries(settings)) {
    if (!allowedKeys.includes(key)) { errors.push("Unknown setting key: " + key); continue; }
    if (key === "customRules") { if (!Array.isArray(value)) { errors.push("customRules must be an array"); continue; } const validRules = []; for (const rule of value) { if (!rule || !rule.pattern || !rule.name) { errors.push("Custom rule missing pattern or name"); continue; } const regexCheck = validateCustomRegexPattern(rule.pattern); if (!regexCheck.ok) { errors.push("Invalid regex in rule '" + rule.name + "': " + regexCheck.error); continue; } validRules.push(rule); } validated[key] = validRules; continue; }
    if (key === "siteList") { if (!Array.isArray(value)) { errors.push("siteList must be an array"); continue; } validated[key] = value.filter((s) => typeof s === "string"); continue; }
    if (key === "siteListMode") { if (!["all", "allowlist", "blocklist"].includes(value)) { errors.push("siteListMode must be 'all', 'allowlist', or 'blocklist'"); continue; } validated[key] = value; continue; }
    if (key === "redactFormat") { if (!["tagged", "stars", "custom"].includes(value)) { errors.push("redactFormat must be 'tagged', 'stars', or 'custom'"); continue; } validated[key] = value; continue; }
    if (key === "killswitch") { if (typeof value !== "object" || value === null) { errors.push("killswitch must be an object"); continue; } if (typeof value.enabled !== "boolean") { errors.push("killswitch.enabled must be a boolean"); continue; } if (value.enabled === true && !value.message) { errors.push("killswitch.message is required when killswitch is enabled"); continue; } validated[key] = value; continue; }
    if (key === "policies") { if (typeof value !== "object" || value === null) { errors.push("policies must be an object"); continue; } for (const [ctx, ctxPolicy] of Object.entries(value)) { if (typeof ctxPolicy !== "object" || ctxPolicy === null) { errors.push("Each policy context must be an object"); continue; } const validActions = ["allow", "redact", "block"]; for (const [type, rule] of Object.entries(ctxPolicy)) if (!rule.action || !validActions.includes(rule.action)) errors.push(`Invalid action for policy ${ctx}.${type}`); } validated[key] = value; continue; }
    if (key === "severity") { if (typeof value !== "object" || value === null) { errors.push("severity must be an object"); continue; } validated[key] = value; continue; }
    if (typeof value === "boolean" || typeof value === "string" || typeof value === "number") { validated[key] = value; continue; }
    errors.push("Unexpected type for '" + key + "': " + typeof value);
  }
  return { valid: errors.length === 0, errors, settings: validated };
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "RECORD_REDACTIONS") { recordRedactions(message.counts, message.source); updateActionBadge(); sendResponse({ ok: true }); return true; }
  if (message.type === "GET_STATS") { getStats((stats) => sendResponse({ stats })); return true; }
  if (message.type === "RESET_STATS") { saveStats({ ...MASKIT_STATS_DEFAULTS }); sendResponse({ ok: true }); return true; }
  if (message.type === "RECORD_AUDIT_EVENTS") { recordAuditEvents(message.events); sendResponse({ ok: true }); return true; }
  if (message.type === "GET_AUDIT_LOG") { getAuditLog((auditLog) => sendResponse({ auditLog })); return true; }
  if (message.type === "RESET_AUDIT_LOG") { saveAuditLog({ events: [], retentionDays: 30 }); sendResponse({ ok: true }); return true; }
  if (message.type === "SET_AUDIT_RETENTION") { getAuditLog((auditLog) => { auditLog.retentionDays = message.retentionDays || 30; saveAuditLog(auditLog); sendResponse({ ok: true }); }); return true; }
  if (message.type === "EXPORT_CONFIG") { chrome.storage.local.get(MASKIT_DEFAULTS, (settings) => sendResponse({ config: { version: "2.4.0", exportDate: new Date().toISOString(), settings } })); return true; }
  if (message.type === "IMPORT_CONFIG") {
    if (!message.config || !message.config.settings) { sendResponse({ ok: false, error: "Invalid config format" }); return true; }
    const validation = validateConfigImport(message.config.settings);
    if (!validation.valid) { sendResponse({ ok: false, error: "Invalid config: " + validation.errors.join(", ") }); return true; }
    const importEvent = createContextEvent({
      source: "browser",
      application: "maskit-options",
      dataType: "CONFIG_IMPORT",
      confidence: 1,
      risk: "low",
      policy: { name: "default", version: "1", result: "allow" },
      action: "allowed",
      explanation: `Configuration imported (${Object.keys(validation.settings).length} settings).`
    });
    recordAuditEvents([importEvent]);
    chrome.storage.local.set(validation.settings, () => {
      if (chrome.runtime.lastError) {
        console.error("MaskIt: Failed to import config:", chrome.runtime.lastError.message);
        sendResponse({ ok: false, error: "Failed to save settings: " + chrome.runtime.lastError.message });
        return;
      }
      updateActionBadge();
      sendResponse({ ok: true, appliedSettings: Object.keys(validation.settings).length });
    });
    return true;
  }
  if (message.type === "UPDATE_BADGE") { updateActionBadge(); sendResponse({ ok: true }); return true; }
  if (message.type === "OPEN_OPTIONS") { chrome.runtime.openOptionsPage(); sendResponse({ ok: true }); return true; }
  if (message.type === "GET_PAUSE_STATE") { getPauseState((paused) => sendResponse({ paused })); return true; }
  if (message.type === "TOGGLE_PAUSE") { getPauseState((paused) => { const newPaused = !paused; setPauseState(newPaused, () => { broadcastPauseState(newPaused); updateActionBadge(); sendResponse({ paused: newPaused }); }); }); return true; }
  if (message.type === "ADD_TO_BLOCKLIST") { const hostname = message.hostname; if (!hostname) { sendResponse({ ok: false }); return true; } chrome.storage.local.get(MASKIT_DEFAULTS, (settings) => { const list = [...(settings.siteList || [])].map((e) => String(e).trim()).filter(Boolean); const mode = settings.siteListMode || "all"; let newList = list; let newMode = mode; if (mode === "allowlist") newList = list.filter((e) => e !== hostname); else { if (!list.includes(hostname)) newList = [...list, hostname]; newMode = "blocklist"; }       chrome.storage.local.set({ siteList: newList, siteListMode: newMode }, () => {
        if (chrome.runtime.lastError) {
          console.error("MaskIt: Failed to update blocklist:", chrome.runtime.lastError.message);
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        updateActionBadge();
        sendResponse({ ok: true });
      }); }); return true; }
});
try { chrome.contextMenus.onClicked.addListener((info, tab) => { if (info.menuItemId === "maskit-scan-selection" && info.selectionText && tab && tab.id) chrome.tabs.sendMessage(tab.id, { type: "SCAN_SELECTION", text: info.selectionText }, () => { void chrome.runtime.lastError; }); }); } catch { }
chrome.commands.onCommand.addListener((command) => { if (command === "toggle-protection") { chrome.storage.local.get(MASKIT_DEFAULTS, (items) => chrome.storage.local.set({ enabled: !items.enabled }, () => { if (chrome.runtime.lastError) console.error("MaskIt: Failed to toggle protection:", chrome.runtime.lastError.message); updateActionBadge(); })); return; } if (command === "pause-protection") getPauseState((paused) => { const newPaused = !paused; setPauseState(newPaused, () => { broadcastPauseState(newPaused); updateActionBadge(); }); }); });
