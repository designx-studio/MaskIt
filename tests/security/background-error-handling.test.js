const test = require("node:test");
const assert = require("assert");

function createMockChrome() {
  const mock = {
    storage: {
      local: {
        get: (keys, callback) => callback({}),
        set: (items, callback) => {
          if (mock._shouldFailStorage) {
            mock._lastError = { message: "Quota exceeded" };
            if (callback) callback();
            return;
          }
          mock._lastError = null;
          if (callback) callback();
        }
      },
      session: {
        get: (keys, callback) => callback({}),
        set: (items, callback) => { if (callback) callback(); }
      }
    },
    runtime: {
      lastError: null,
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      openOptionsPage: () => {}
    },
    _shouldFailStorage: false,
    _lastError: null
  };
  
  Object.defineProperty(mock.runtime, "lastError", {
    get: () => mock._lastError,
    set: (val) => { mock._lastError = val; }
  });
  
  return mock;
}

const mockChrome = createMockChrome();
global.chrome = mockChrome;

// Import extracted background audit log module directly
const { saveAuditLog, saveStats, AUDIT_LOG_MAX_EVENTS } = require("../../background-audit-log.js");

test("background audit log module error handling and truncation", () => {
  mockChrome._shouldFailStorage = false;
  saveAuditLog({ events: [{ id: "1", timestamp: Date.now() }], retentionDays: 30 });
  assert.strictEqual(mockChrome._lastError, null);

  mockChrome._shouldFailStorage = true;
  saveAuditLog({ events: [{ id: "1", timestamp: Date.now() }], retentionDays: 30 });
  assert.strictEqual(mockChrome._lastError.message, "Quota exceeded");

  const largeLog = {
    events: Array.from({ length: 6000 }, (_, i) => ({ id: String(i), timestamp: Date.now() + i })),
    retentionDays: 30
  };
  mockChrome._shouldFailStorage = false;
  saveAuditLog(largeLog);
  assert.ok(largeLog.events.length <= AUDIT_LOG_MAX_EVENTS);

  saveStats({ totalRedactions: 100 });
});
