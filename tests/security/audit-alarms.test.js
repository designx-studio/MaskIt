const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

console.log("Running audit-alarms.test.js...");

function createMockChrome() {
  const createdAlarms = [];
  const alarmListeners = [];
  const storage = { local: {}, session: {} };

  return {
    storage: {
      local: {
        get: (keys, callback) => callback(storage.local),
        set: (items, callback) => {
          Object.assign(storage.local, items);
          if (callback) callback();
        }
      },
      session: {
        get: (keys, callback) => callback(storage.session),
        set: (items, callback) => {
          Object.assign(storage.session, items);
          if (callback) callback();
        }
      },
      onChanged: { addListener: () => {} }
    },
    alarms: {
      create: (name, alarmInfo) => {
        createdAlarms.push({ name, alarmInfo });
      },
      onAlarm: {
        addListener: (listener) => {
          alarmListeners.push(listener);
        }
      }
    },
    runtime: {
      lastError: null,
      onInstalled: { addListener: () => {} },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: () => {} }
    },
    commands: { onCommand: { addListener: () => {} } },
    contextMenus: { onClicked: { addListener: () => {} } },
    action: { setBadgeText: () => {}, setBadgeBackgroundColor: () => {}, setTitle: () => {} },
    tabs: { query: () => {}, onActivated: { addListener: () => {} }, onUpdated: { addListener: () => {} } },
    _createdAlarms: createdAlarms,
    _alarmListeners: alarmListeners,
    _storage: storage
  };
}

const mockChrome = createMockChrome();

const context = {
  chrome: mockChrome,
  console,
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  Date: globalThis.Date,
  TextEncoder: class { encode(str) { return Buffer.from(str); } },
  crypto: { subtle: { digest: async () => new Uint8Array(32) } },
  importScripts: () => {}
};

vm.createContext(context);

vm.runInContext(fs.readFileSync(path.join(__dirname, "../../settings.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../context-event.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../background.js"), "utf8"), context);

// 1. Verify chrome.alarms.create was called on init with expected alarm name
const flushAlarm = mockChrome._createdAlarms.find((a) => a.name === "maskit-audit-flush");
assert.ok(flushAlarm, "chrome.alarms.create should register 'maskit-audit-flush' alarm");

// 2. Verify chrome.alarms.onAlarm listener flushes pending audit log events
assert.ok(mockChrome._alarmListeners.length > 0, "chrome.alarms.onAlarm listener should be registered");

const testEvent = {
  eventId: "evt_alarm_test_1",
  timestamp: Date.now(),
  source: "browser",
  application: "chatgpt.com",
  dataType: "EMAIL",
  confidence: 1,
  risk: "medium",
  action: "redacted"
};

// Record an event into pending buffer
context.recordAuditEvents([testEvent]);

// Trigger alarm callback directly
const alarmCallback = mockChrome._alarmListeners[0];
alarmCallback({ name: "maskit-audit-flush" });

setTimeout(() => {
  const auditLog = mockChrome._storage.local.auditLog;
  assert.ok(auditLog && auditLog.events, "Audit log should exist in local storage after alarm flush");
  const stored = auditLog.events.find((e) => e.eventId === "evt_alarm_test_1" || e.dataType === "EMAIL");
  assert.ok(stored, "Pending audit event must be persisted to storage when alarm fires");
  console.log("audit-alarms.test.js passed!");
}, 100);
