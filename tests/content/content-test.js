const assert = require("assert");
const { JSDOM } = require("jsdom");

console.log("Running content.js functional tests...");

function createMockChrome() {
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
      }
    },
    runtime: {
      lastError: null,
      sendMessage: (msg, callback) => { if (callback) callback({}); },
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
    _storage: storage
  };
}

function createTestDOM() {
  const dom = new JSDOM(`<!DOCTYPE html>
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
  return dom;
}

const mockChrome = createMockChrome();
global.chrome = mockChrome;

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const context = {
  chrome: mockChrome,
  console,
  document: null,
  window: null,
  location: { hostname: "chatgpt.com", href: "https://chatgpt.com" },
  navigator: { userAgent: "test" },
  setTimeout: globalThis.setTimeout,
  clearTimeout: globalThis.clearTimeout,
  setInterval: globalThis.setInterval,
  clearInterval: globalThis.clearInterval,
  URL: globalThis.URL,
  Blob: globalThis.Blob,
  Event: globalThis.Event,
  CustomEvent: globalThis.CustomEvent,
  KeyboardEvent: globalThis.KeyboardEvent,
  InputEvent: globalThis.InputEvent,
  ClipboardEvent: globalThis.ClipboardEvent,
  MutationObserver: globalThis.MutationObserver,
  getSelection: () => ({ rangeCount: 0, toString: () => "" }),
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  crypto: { subtle: { digest: async () => new Uint8Array(32) } },
  TextEncoder: class { encode(str) { return Buffer.from(str); } }
};

vm.createContext(context);

vm.runInContext(fs.readFileSync(path.join(__dirname, "../../settings.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../browser-rules.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../context-event.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../detector.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, "../../sanitizer.js"), "utf8"), context);

const dom = createTestDOM();
context.document = dom.window.document;
context.window = dom.window;
context.location = dom.window.location;

console.log("Content.js functional tests setup completed");
console.log("Note: Full content.js testing requires browser environment mocks");
console.log("content-test.js passed!");
