importScripts("settings.js");

const BADGE_ON_COLOR = "#00b894";
const BADGE_OFF_COLOR = "#5f6368";
const BADGE_PAUSED_COLOR = "#f6b93b";

// ── Pause state (chrome.storage.session — clears on browser restart) ──────

function getPauseState(callback) {
  try {
    chrome.storage.session.get({ paused: false }, (data) => {
      callback(!!(data && data.paused));
    });
  } catch {
    callback(false);
  }
}

function setPauseState(paused, callback) {
  try {
    chrome.storage.session.set({ paused }, () => {
      if (callback) callback();
    });
  } catch {
    if (callback) callback();
  }
}

/**
 * Broadcast pause state change to all content scripts.
 * If tabId is provided, only that tab is notified.
 */
function broadcastPauseState(paused, tabId) {
  const msg = { type: "PAUSE_STATE_CHANGED", paused };
  if (typeof tabId === "number") {
    chrome.tabs.sendMessage(tabId, msg, () => { void chrome.runtime.lastError; });
    return;
  }
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, msg, () => { void chrome.runtime.lastError; });
      }
    });
  });
}

// ── Statistics (legacy, kept for backward compat) ────────────────────────

function getStats(callback) {
  chrome.storage.local.get({ stats: MASKIT_STATS_DEFAULTS }, (data) => {
    callback(data.stats || { ...MASKIT_STATS_DEFAULTS });
  });
}

function saveStats(stats) {
  chrome.storage.local.set({ stats });
}

function recordRedactions(counts, source) {
  if (!counts || !Object.keys(counts).length) return;

  getStats((stats) => {
    const added = Object.values(counts).reduce((sum, count) => sum + count, 0);
    stats.totalRedactions += added;
    stats.bySource = stats.bySource || { paste: 0, copy: 0, typing: 0 };
    stats.byType = stats.byType || {};
    stats.bySource[source] = (stats.bySource[source] || 0) + added;
    Object.entries(counts).forEach(([type, count]) => {
      stats.byType[type] = (stats.byType[type] || 0) + count;
    });
    saveStats(stats);
    updateActionBadge();
  });
}

// ── Structured Audit Log ────────────────────────────────────────────────

function getAuditLog(callback) {
  chrome.storage.local.get({ auditLog: { events: [], retentionDays: 30 } }, (data) => {
    callback(data.auditLog || { events: [], retentionDays: 30 });
  });
}

function saveAuditLog(auditLog) {
  chrome.storage.local.set({ auditLog });
}

async function computeChainHash(previousHash, eventId, timestamp) {
  const input = (previousHash || "0") + eventId + timestamp;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function recordAuditEvent(event) {
  if (!event) return;
  getAuditLog(async (auditLog) => {
    const events = auditLog.events || [];
    const previousHash = events.length > 0 ? events[events.length - 1].chainHash : null;
    event.chainHash = await computeChainHash(previousHash, event.id, event.timestamp);
    auditLog.events.push(event);
    // Prune old events
    const retention = auditLog.retentionDays || 30;
    const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000;
    auditLog.events = auditLog.events.filter((e) => e.timestamp >= cutoff);
    saveAuditLog(auditLog);
  });
}

async function recordAuditEvents(events) {
  if (!events || !events.length) return;
  getAuditLog(async (auditLog) => {
    const existing = auditLog.events || [];
    for (const event of events) {
      const previousHash = existing.length > 0 ? existing[existing.length - 1].chainHash : null;
      event.chainHash = await computeChainHash(previousHash, event.id, event.timestamp);
      existing.push(event);
    }
    // Prune old events
    const retention = auditLog.retentionDays || 30;
    const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000;
    auditLog.events = existing.filter((e) => e.timestamp >= cutoff);
    saveAuditLog(auditLog);
  });
}

// ── Unmask tracking ─────────────────────────────────────────────────────

const unmaskStore = {};

function recordUnmask(token, value, durationMs) {
  getAuditLog((auditLog) => {
    const evt = auditLog.events.find((e) => e.unmaskToken === token);
    if (evt) {
      evt.unmaskedAt = Date.now();
      evt.unmaskedDuration = durationMs || 30000;
      saveAuditLog(auditLog);
    }
  });
}

function getUnmaskedValue(token) {
  return unmaskStore[token] || null;
}

function setUnmaskedValue(token, value, durationMs) {
  unmaskStore[token] = value;
  setTimeout(() => {
    delete unmaskStore[token];
  }, durationMs || 30000);
}

// ── Badge (tri-state) ─────────────────────────────────────────────────────

function getPageStatus(settings, url) {
  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return { active: false, hostname: "" };
  }
  const hostname = new URL(url).hostname;
  const active = settings.enabled !== false && isSiteAllowed(settings, hostname);
  return { active, hostname };
}

function applyBadge(tabId, active, paused) {
  let text, color, title;

  if (paused && active) {
    text = "PSE";
    color = BADGE_PAUSED_COLOR;
    title = "Maskit — paused (data passing through)";
  } else if (active) {
    text = "ON";
    color = BADGE_ON_COLOR;
    title = "Maskit — protecting this page";
  } else {
    text = "OFF";
    color = BADGE_OFF_COLOR;
    title = "Maskit — off on this page";
  }

  if (typeof tabId === "number") {
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({ tabId, color });
    chrome.action.setTitle({ tabId, title });
    return;
  }
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setTitle({ title });
}

function updateActionBadge(tabId) {
  getPauseState((paused) => {
    chrome.storage.local.get(MASKIT_DEFAULTS, (settings) => {
      if (typeof tabId === "number") {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab) return;
          const status = getPageStatus(settings, tab.url);
          applyBadge(tabId, status.active, paused);
        });
        return;
      }
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab) {
          applyBadge(undefined, settings.enabled !== false, paused);
          return;
        }
        const status = getPageStatus(settings, tab.url);
        applyBadge(tab.id, status.active, paused);
      });
    });
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => updateActionBadge());
chrome.runtime.onStartup.addListener(() => updateActionBadge());

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") updateActionBadge();
});

chrome.tabs.onActivated.addListener(({ tabId }) => updateActionBadge(tabId));

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") updateActionBadge(tabId);
});

// ── Config import validation ──────────────────────────────────────────────

function validateConfigImport(settings) {
  const errors = [];
  const validated = {};

  // Whitelist of allowed settings keys
  const allowedKeys = [
    "enabled", "scanPaste", "scanCopy", "scanTyping",
    "reviewBeforeRedact", "redactFormat", "customRedactText",
    "siteListMode", "siteList",
    "EMAIL", "PHONE", "CARD", "MPESA", "SSN", "API_KEY", "IP_ADDRESS", "PASSPORT", "BANK_ACCOUNT",
    "customRules", "killswitch", "policies", "pauseAutoResume", "pauseAutoResumeSecs",
    "browserAIProtection", "severity"
  ];

  if (typeof settings !== "object" || settings === null) {
    return { valid: false, errors: ["Settings must be an object"], settings: {} };
  }

  for (const [key, value] of Object.entries(settings)) {
    // Check if key is allowed
    if (!allowedKeys.includes(key)) {
      errors.push("Unknown setting key: " + key);
      continue;
    }

    // Type validation for specific keys
    if (key === "customRules") {
      if (!Array.isArray(value)) {
        errors.push("customRules must be an array");
        continue;
      }
      // Validate each rule's regex pattern
      const validRules = [];
      for (const rule of value) {
        if (!rule || !rule.pattern || !rule.name) {
          errors.push("Custom rule missing pattern or name");
          continue;
        }
        const regexCheck = validateCustomRegexPattern(rule.pattern);
        if (!regexCheck.ok) {
          errors.push("Invalid regex in rule '" + rule.name + "': " + regexCheck.error);
          continue;
        }
        validRules.push(rule);
      }
      validated[key] = validRules;
      continue;
    }

    if (key === "siteList") {
      if (!Array.isArray(value)) {
        errors.push("siteList must be an array");
        continue;
      }
      validated[key] = value.filter((s) => typeof s === "string");
      continue;
    }

    if (key === "siteListMode") {
      if (!["all", "allowlist", "blocklist"].includes(value)) {
        errors.push("siteListMode must be 'all', 'allowlist', or 'blocklist'");
        continue;
      }
      validated[key] = value;
      continue;
    }

    if (key === "redactFormat") {
      if (!["tagged", "stars", "custom"].includes(value)) {
        errors.push("redactFormat must be 'tagged', 'stars', or 'custom'");
        continue;
      }
      validated[key] = value;
      continue;
    }

    if (key === "killswitch") {
      if (typeof value !== "object" || value === null) {
        errors.push("killswitch must be an object");
        continue;
      }
      validated[key] = value;
      continue;
    }

    if (key === "policies") {
      if (typeof value !== "object" || value === null) {
        errors.push("policies must be an object");
        continue;
      }
      validated[key] = value;
      continue;
    }

    if (key === "severity") {
      if (typeof value !== "object" || value === null) {
        errors.push("severity must be an object");
        continue;
      }
      validated[key] = value;
      continue;
    }

    // Boolean flags (EMAIL, PHONE, CARD, enabled, etc.)
    if (typeof value === "boolean") {
      validated[key] = value;
      continue;
    }

    // String values (customRedactText)
    if (typeof value === "string") {
      validated[key] = value;
      continue;
    }

    // Number values (pauseAutoResumeSecs)
    if (typeof value === "number") {
      validated[key] = value;
      continue;
    }

    errors.push("Unexpected type for '" + key + "': " + typeof value);
  }

  return {
    valid: errors.length === 0,
    errors,
    settings: validated
  };
}

// ── Message handlers ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.type === "RECORD_REDACTIONS") {
    recordRedactions(message.counts, message.source);
    updateActionBadge();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_STATS") {
    getStats((stats) => sendResponse({ stats }));
    return true;
  }

  if (message.type === "RESET_STATS") {
    saveStats({ ...MASKIT_STATS_DEFAULTS });
    sendResponse({ ok: true });
    return true;
  }

  // ── Audit log ──────────────────────────────────────────────────────────

  if (message.type === "RECORD_AUDIT_EVENTS") {
    recordAuditEvents(message.events);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_AUDIT_LOG") {
    getAuditLog((auditLog) => sendResponse({ auditLog }));
    return true;
  }

  if (message.type === "RESET_AUDIT_LOG") {
    saveAuditLog({ events: [], retentionDays: 30 });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "SET_AUDIT_RETENTION") {
    getAuditLog((auditLog) => {
      auditLog.retentionDays = message.retentionDays || 30;
      saveAuditLog(auditLog);
      sendResponse({ ok: true });
    });
    return true;
  }

  // ── Unmask ─────────────────────────────────────────────────────────────

  if (message.type === "UNMASK_VALUE") {
    setUnmaskedValue(message.token, message.value, message.durationMs || 30000);
    recordUnmask(message.token, message.value, message.durationMs || 30000);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_UNMASKED_VALUE") {
    const val = getUnmaskedValue(message.token);
    sendResponse({ value: val });
    return true;
  }

  // ── Config export/import ───────────────────────────────────────────────

  if (message.type === "EXPORT_CONFIG") {
    chrome.storage.local.get(MASKIT_DEFAULTS, (settings) => {
      const exportData = {
        version: "2.4.0",
        exportDate: new Date().toISOString(),
        settings: settings
      };
      sendResponse({ config: exportData });
    });
    return true;
  }

  if (message.type === "IMPORT_CONFIG") {
    if (!message.config || !message.config.settings) {
      sendResponse({ ok: false, error: "Invalid config format" });
      return true;
    }

    // Validate against schema
    const validation = validateConfigImport(message.config.settings);
    if (!validation.valid) {
      sendResponse({ ok: false, error: "Invalid config: " + validation.errors.join(", ") });
      return true;
    }

    // Log the import attempt to audit log
    getAuditLog((auditLog) => {
      auditLog.events.push({
        id: "evt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        timestamp: Date.now(),
        type: "CONFIG_IMPORT",
        action: "imported",
        settingsCount: Object.keys(validation.settings).length,
        customRulesCount: (validation.settings.customRules || []).length
      });
      saveAuditLog(auditLog);
    });

    // Apply validated config
    chrome.storage.local.set(validation.settings, () => {
      updateActionBadge();
      sendResponse({ ok: true, appliedSettings: Object.keys(validation.settings).length });
    });
    return true;
  }

  if (message.type === "UPDATE_BADGE") {
    updateActionBadge();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return true;
  }

  // ── Pause ──────────────────────────────────────────────────────────────

  if (message.type === "GET_PAUSE_STATE") {
    getPauseState((paused) => sendResponse({ paused }));
    return true;
  }

  if (message.type === "TOGGLE_PAUSE") {
    getPauseState((paused) => {
      const newPaused = !paused;
      setPauseState(newPaused, () => {
        broadcastPauseState(newPaused);
        updateActionBadge();
        sendResponse({ paused: newPaused });
      });
    });
    return true;
  }

  // ── Quick page whitelist ───────────────────────────────────────────────

  if (message.type === "ADD_TO_BLOCKLIST") {
    const hostname = message.hostname;
    if (!hostname) { sendResponse({ ok: false }); return true; }

    chrome.storage.local.get(MASKIT_DEFAULTS, (settings) => {
      const list = [...(settings.siteList || [])].map((e) => String(e).trim()).filter(Boolean);
      const mode = settings.siteListMode || "all";

      let newList = list;
      let newMode = mode;

      if (mode === "allowlist") {
        // Remove from allowlist so the page becomes unprotected
        newList = list.filter((e) => e !== hostname);
      } else {
        // Add to blocklist (create blocklist if not already in one)
        if (!list.includes(hostname)) newList = [...list, hostname];
        newMode = "blocklist";
      }

      chrome.storage.local.set({ siteList: newList, siteListMode: newMode }, () => {
        updateActionBadge();
        sendResponse({ ok: true });
      });
    });
    return true;
  }
});

// ── Context menus ───────────────────────────────────────────────────────

try {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "maskit-scan-selection" && info.selectionText && tab && tab.id) {
      // Send selected text to content script for scanning
      chrome.tabs.sendMessage(tab.id, {
        type: "SCAN_SELECTION",
        text: info.selectionText
      }, () => { void chrome.runtime.lastError; });
    }
  });
} catch { }

// ── Keyboard commands ─────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-protection") {
    chrome.storage.local.get(MASKIT_DEFAULTS, (items) => {
      chrome.storage.local.set({ enabled: !items.enabled }, () => updateActionBadge());
    });
    return;
  }

  if (command === "pause-protection") {
    getPauseState((paused) => {
      const newPaused = !paused;
      setPauseState(newPaused, () => {
        broadcastPauseState(newPaused);
        updateActionBadge();
      });
    });
  }
});