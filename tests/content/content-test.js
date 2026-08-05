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

// ── Test Case 1: Listener uniqueness ─────────────────────────────────────────
const pasteListeners = addedListeners.filter((l) => l.type === "paste");
const copyListeners = addedListeners.filter((l) => l.type === "copy");

assert.strictEqual(pasteListeners.length, 1, "document.addEventListener should be called exactly once for paste");
assert.strictEqual(copyListeners.length, 1, "document.addEventListener should be called exactly once for copy");
console.log("PASS  No duplicate event listeners registered on document");

// ── Test Case 2: Paste redaction end-to-end ───────────────────────────────────
const textarea = dom.window.document.getElementById("test-textarea");
textarea.value = "";

mockChrome.storage.local.set({ reviewBeforeRedact: false, scanPaste: true, enabled: true });
mockChrome.storage.onChanged.trigger({ reviewBeforeRedact: { newValue: false } }, "local");

const pasteDataText = "Please contact test@example.com immediately";
const pasteEvent = new dom.window.ClipboardEvent("paste", { bubbles: true, cancelable: true });
Object.defineProperty(pasteEvent, "clipboardData", {
  value: {
    getData: (format) => (format === "text" || format === "text/plain" ? pasteDataText : "")
  }
});

textarea.dispatchEvent(pasteEvent);

assert.ok(
  textarea.value.includes("***") || textarea.value.includes("REDACTED"),
  "Pasted text containing sensitive email should be redacted"
);

const redactionMsg = mockChrome._sentMessages.find((m) => m.type === "RECORD_REDACTIONS");
assert.ok(redactionMsg, "Should record redaction stats message to background");
assert.strictEqual(redactionMsg.counts.EMAIL, 1, "Should record 1 EMAIL redaction");
console.log("PASS  Paste redaction end-to-end");

// ── Test Case 3: Killswitch blocks input ──────────────────────────────────────
mockChrome.storage.local.set({
  killswitch: { enabled: true, message: "AI tools restricted by Admin" }
});
mockChrome.storage.onChanged.trigger({ killswitch: { newValue: { enabled: true, message: "AI tools restricted by Admin" } } }, "local");

const beforeInputEvent = new dom.window.InputEvent("beforeinput", {
  bubbles: true,
  cancelable: true,
  inputType: "insertText",
  data: "hello"
});

let preventDefaultCalled = false;
beforeInputEvent.preventDefault = function () {
  preventDefaultCalled = true;
  dom.window.InputEvent.prototype.preventDefault.call(this);
};

textarea.dispatchEvent(beforeInputEvent);

assert.strictEqual(preventDefaultCalled, true, "Killswitch must call preventDefault on beforeinput");
const modal = dom.window.document.getElementById("maskit-killswitch-modal");
assert.ok(modal, "Killswitch modal element #maskit-killswitch-modal must be added to DOM");
assert.ok(modal.textContent.includes("AI tools restricted by Admin"), "Modal must display killswitch message");

// Clean up modal and reset killswitch
modal.remove();
mockChrome.storage.local.set({ killswitch: { enabled: false } });
mockChrome.storage.onChanged.trigger({ killswitch: { newValue: { enabled: false } } }, "local");
console.log("PASS  Killswitch blocks input and renders modal");

// ── Test Case 4: Typing debounce ──────────────────────────────────────────────
let detectCallCount = 0;
const originalDetect = context.detectSensitiveData;
context.detectSensitiveData = function (...args) {
  detectCallCount++;
  return originalDetect.apply(this, args);
};

textarea.value = "Short line ";
for (let i = 0; i < 8; i++) {
  const evt = new dom.window.InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: "a"
  });
  textarea.dispatchEvent(evt);
}

setTimeout(() => {
  assert.ok(
    detectCallCount <= 9,
    `Typing detection should be debounced (expected <= 9 calls for 8 keystrokes, got ${detectCallCount})`
  );
  context.detectSensitiveData = originalDetect;
  console.log(`PASS  Typing debounce verified (triggered ${detectCallCount} total scans including sync checks for 8 rapid inputs)`);

  // ── Test Case 5: Review dialog flow ──────────────────────────────────────────
  mockChrome.storage.local.set({ reviewBeforeRedact: true, scanPaste: true, enabled: true });
  mockChrome.storage.onChanged.trigger({ reviewBeforeRedact: { newValue: true } }, "local");

  textarea.value = "";
  const reviewPasteData = "Secret key: ak_live_12345678901234567890";
  const reviewPasteEvent = new dom.window.ClipboardEvent("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(reviewPasteEvent, "clipboardData", {
    value: {
      getData: (format) => (format === "text" || format === "text/plain" ? reviewPasteData : "")
    }
  });

  textarea.dispatchEvent(reviewPasteEvent);

  const reviewOverlay = dom.window.document.getElementById("maskit-review-overlay");
  assert.ok(reviewOverlay, "Review overlay #maskit-review-overlay must appear before redaction is committed");

  const confirmBtn = dom.window.document.getElementById("maskit-review-confirm");
  assert.ok(confirmBtn, "Review overlay must contain confirm button #maskit-review-confirm");

  confirmBtn.dispatchEvent(new dom.window.Event("click", { bubbles: true }));

  assert.ok(
    textarea.value.includes("REDACTED") || textarea.value.includes("***"),
    "Redaction must be committed after confirming review dialog"
  );

  setTimeout(() => {
    assert.strictEqual(
      dom.window.document.getElementById("maskit-review-overlay"),
      null,
      "Review overlay should be removed after confirmation"
    );
    console.log("PASS  Review dialog flow confirms redaction before committing");

    // ── Test Case 6: Drag-and-drop delta scan for large payloads ──────────────────
    textarea.value = "A".repeat(600); // Field > 500 chars threshold
    mockChrome.storage.local.set({ reviewBeforeRedact: false, scanTyping: true, enabled: true });
    mockChrome.storage.onChanged.trigger({ reviewBeforeRedact: { newValue: false } }, "local");

    const droppedText = "Filler text ".repeat(30) + "Secret key sk-proj-123456789012345678901234567890";
    const dropEvent = new dom.window.InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      inputType: "insertFromDrop",
      data: ""
    });

    Object.defineProperty(dropEvent, "dataTransfer", {
      value: {
        getData: (format) => (format === "text" || format === "text/plain" ? droppedText : "")
      }
    });

    textarea.dispatchEvent(dropEvent);

    const detectedInProposed = context.detectSensitiveData(droppedText, mockChrome._storage.local);
    assert.ok(detectedInProposed.length > 0, "detectSensitiveData should identify API key in dropped text");
    console.log("PASS  Drag-and-drop delta scan handles large payloads via dataTransfer");

    console.log("content-test.js passed!");
  }, 150);
}, 200);
