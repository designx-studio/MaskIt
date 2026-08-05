const AUDIT_LOG_MAX_EVENTS = 5000;

function saveAuditLog(auditLog) {
  if (auditLog && auditLog.events && auditLog.events.length > AUDIT_LOG_MAX_EVENTS) {
    auditLog.events = auditLog.events.slice(-AUDIT_LOG_MAX_EVENTS);
  }
  chrome.storage.local.set({ auditLog }, () => {
    if (chrome.runtime.lastError) {
      console.error("MaskIt: Failed to save audit log:", chrome.runtime.lastError.message);
      chrome.storage.local.set({ auditLogWriteError: true }, () => {
        if (chrome.runtime.lastError) {
          console.error("MaskIt: Failed to set audit log error flag:", chrome.runtime.lastError.message);
        }
      });
    }
  });
}

function saveStats(stats) {
  chrome.storage.local.set({ stats }, () => {
    if (chrome.runtime.lastError) {
      console.error("MaskIt: Failed to save stats:", chrome.runtime.lastError.message);
    }
  });
}

function getAuditLog(callback) {
  chrome.storage.local.get({ auditLog: { events: [], retentionDays: 30 } }, (data) =>
    callback(data.auditLog || { events: [], retentionDays: 30 })
  );
}

function getStats(callback) {
  const defaults = typeof MASKIT_STATS_DEFAULTS !== "undefined"
    ? MASKIT_STATS_DEFAULTS
    : { totalRedactions: 0, byType: {}, bySource: { paste: 0, copy: 0, typing: 0 } };
  chrome.storage.local.get({ stats: defaults }, (data) =>
    callback(data.stats || { ...defaults })
  );
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AUDIT_LOG_MAX_EVENTS,
    saveAuditLog,
    saveStats,
    getAuditLog,
    getStats
  };
}
