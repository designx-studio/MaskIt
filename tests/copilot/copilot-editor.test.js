const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadEditorsScript(hostname) {
  const context = {
    console, RegExp, String, Object, Array, Set, Math, Date, Number, Boolean, JSON, Error,
    parseInt, parseFloat, isNaN, Infinity, undefined,
    location: { hostname },
    window: {},
    document: {}
  };
  vm.createContext(context);
  const code = fs.readFileSync(path.resolve(__dirname, "../../editors.js"), "utf8");
  vm.runInContext(code, context);
  return context;
}

// Test 1: Copilot domain editor profile detection
{
  const browser = loadEditorsScript("sydney.copilot.microsoft.com");
  
  // A textarea element should be treated as plain
  const textareaMock = { tagName: "TEXTAREA", isContentEditable: false };
  assert.strictEqual(browser.getEditorProfile(textareaMock), "plain");
  
  // A contenteditable div element on copilot subdomains should be treated as rich
  const divMock = { tagName: "DIV", isContentEditable: true };
  assert.strictEqual(browser.getEditorProfile(divMock), "rich");
  assert.ok(browser.isRichEditor(divMock));
}

{
  const browser = loadEditorsScript("copilot.microsoft.com");
  const divMock = { tagName: "DIV", isContentEditable: true };
  assert.strictEqual(browser.getEditorProfile(divMock), "rich");
}

console.log("Copilot editor profile tests passed!");
