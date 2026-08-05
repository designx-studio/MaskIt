const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { JSDOM } = require("jsdom");

console.log("Running content.js functional tests...");

function createMockChrome() {
  const storage = { local: {}, session: {} };
  const sentMessages = [];
  return {
    storage: {
      local: {
        get: (keys, callback) => {
          if (typeof keys === "object" && keys !== null) {
            const res = Object.assign({}, keys, storage.local);
            if (callback) callback(res);
            return res;
          }
          if (callback) callback(storage.local);
          return storage.local;
        },
        set: (items, callback) => {
          Object.assign(storage.local, items);
          if (callback) callback();
        }
      },
      session: {
        get: (keys, callback) => {
          if (typeof keys === "object" && keys !== null) {
            const res = Object.assign({}, keys, storage.session);
            if (callback) callback(res);
            return res;
          }
          if (callback) callback(storage.session);
          return storage.session;
        },
        set: (items, callback) => {
          Object.assign(storage.session, items);
          if (callback) callback();
        }
      },
      onChanged: {
        _listeners: [],
        addListener: function(fn) { this._listeners.push(fn); },
        trigger: function(changes, area) { this._listeners.forEach(fn => fn(changes, area)); }
      }
    },
    runtime: {
      lastError: null,
      sendMessage: (msg, callback) => {
        sentMessages.push(msg);
        if (callback) callback({ ok: true });
      },
      onMessage: { addListener: () => {} }
    },
    tabs: {
      query: (opts, callback) => callback([]),
      sendMessage: (tabId, msg, callback) => { if (callback) callback(); }
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {},
      setTitle: () => {}
    },
    _storage: storage,
    _sentMessages: sentMessages
  };
}

function createTestDOM() {
  return new JSDOM(`<!DOCTYPE html>
<html>
<body>
  <div id="test-container">
    <textarea id="test-textarea" rows="4" cols="50"></textarea>
    <div id="test-contenteditable" contenteditable="true"></div>
  </div>
</body>
</html>`, {
    url: "https://chatgpt.com",
    pretendToBeVisual: true
  });
}

const mockChrome = createMockChrome();
global.chrome = mockChrome;

const dom = createTestDOM();

const addedListeners = [];
const originalAddEventListener = dom.window.document.addEventListener.bind(dom.window.document);
dom.window.document.addEventListener = function(type, listener, options) {
  addedListeners.push({ type, listener, options });
  return originalAddEventListener(type, listener, options);
};

class CustomClipboardEvent extends dom.window.Event {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.clipboardData = eventInitDict.clipboardData || null;
  }
}
dom.window.ClipboardEvent = CustomClipboardEvent;

const context = {
  chrome: mockChrome,
  console,
  document: dom.window.document,
  window: dom.window,
  location: dom.window.location,
  navigator: dom.window.navigator,
  HTMLTextAreaElement: dom.window.HTMLTextAreaElement,
  HTMLInputElement: dom.window.HTMLInputElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  NodeFilter: dom.window.NodeFilter,
  Event: dom.window.Event,
  CustomEvent: dom.window.CustomEvent,
  KeyboardEvent: dom.window.KeyboardEvent,
  InputEvent: dom.window.InputEvent,
  ClipboardEvent: CustomClipboardEvent,
  MutationObserver: dom.window.MutationObserver,
  setTimeout: dom.window.setTimeout.bind(dom.window),
  clearTimeout: dom.window.clearTimeout.bind(dom.window),
  setInterval: dom.window.setInterval.bind(dom.window),
  clearInterval: dom.window.clearInterval.bind(dom.window),
  URL: dom.window.URL,
  Blob: dom.window.Blob,
  getSelection: () => dom.window.getSelection(),
  requestAnimationFrame: (cb) => dom.window.setTimeout(cb, 0),
  cancelAnimationFrame: (id) => dom.window.clearTimeout(id),
  crypto: { subtle: { digest: async () => new Uint8Array(32) } },
  TextEncoder: class { encode(str) { return Buffer.from(str); } }
};

vm.createContext(context);

// Load script dependency chain
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../settings.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../browser-rules.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../context-event.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../detector.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../sanitizer.js"), "utf8"), context);
if (fs.existsSync(path.join(__dirname, "../../editors.js"))) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../../editors.js"), "utf8"), context);
}

// Execute content.js (which self-invokes _maskitInit())
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../content.js"), "utf8"), context);

// ── Test Case 6: Drag-and-drop delta scan for large payloads ──────────────────
const textarea = dom.window.document.getElementById("test-textarea");
textarea.value = "A".repeat(600); // Field > 500 chars threshold

mockChrome.storage.local.set({ reviewBeforeRedact: false, scanTyping: true, enabled: true });
mockChrome.storage.onChanged.trigger({ reviewBeforeRedact: { newValue: false } }, "local");

// Payload > 250 chars with API key at the far end (> 200 chars from drop anchor)
const droppedText = "Filler text ".repeat(30) + "Secret key sk-proj-123456789012345678901234567890";

const dropEvent = new dom.window.InputEvent("beforeinput", {
  bubbles: true,
  cancelable: true,
  inputType: "insertFromDrop",
  data: "" // Empty data per browser spec for drop events
});

Object.defineProperty(dropEvent, "dataTransfer", {
  value: {
    getData: (format) => (format === "text" || format === "text/plain" ? droppedText : "")
  }
});

textarea.dispatchEvent(dropEvent);

// Verify that handleBeforeInput retrieved data from dataTransfer and scanned the full dropped window
const detectedInProposed = context.detectSensitiveData(droppedText, mockChrome._storage.local);
assert.ok(detectedInProposed.length > 0, "detectSensitiveData should identify API key in dropped text");
console.log("PASS  Drag-and-drop delta scan handles large payloads via dataTransfer");

console.log("content-test.js passed!");
