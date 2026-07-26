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

function recordAuditEvent(event) {
  if (!event) return;
  getAuditLog((auditLog) => {
    auditLog.events.push(event);
    // Prune old events
    const retention = auditLog.retentionDays || 30;
    const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000;
    auditLog.events = auditLog.events.filter((e) => e.timestamp >= cutoff);
    saveAuditLog(auditLog);
  });
}

function recordAuditEvents(events) {
  if (!events || !events.length) return;
  getAuditLog((auditLog) => {
    auditLog.events = auditLog.events.concat(events);
    // Prune old events
    const retention = auditLog.retentionDays || 30;
    const cutoff = Date.now() - retention * 24 * 60 * 60 * 1000;
    auditLog.events = auditLog.events.filter((e) => e.timestamp >= cutoff);
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
    chrome.storage.sync.get(MASKIT_DEFAULTS, (settings) => {
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
  if (area === "sync") updateActionBadge();
});

chrome.tabs.onActivated.addListener(({ tabId }) => updateActionBadge(tabId));

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") updateActionBadge(tabId);
});

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
    chrome.storage.sync.get(MASKIT_DEFAULTS, (settings) => {
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
    if (message.config && message.config.settings) {
      chrome.storage.sync.set(message.config.settings, () => {
        updateActionBadge();
        sendResponse({ ok: true });
      });
    } else {
      sendResponse({ ok: false, error: "Invalid config format" });
    }
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

    chrome.storage.sync.get(MASKIT_DEFAULTS, (settings) => {
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

      chrome.storage.sync.set({ siteList: newList, siteListMode: newMode }, () => {
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
    chrome.storage.sync.get(MASKIT_DEFAULTS, (items) => {
      chrome.storage.sync.set({ enabled: !items.enabled }, () => updateActionBadge());
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
