const test = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

test("Browser and engine MASKIT_DEFAULTS are in sync", () => {
  const browserContext = {
    console, RegExp, String, Object, Array, Set, Math, Date, Number, Boolean, JSON
  };
  vm.createContext(browserContext);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "settings.js"), "utf8"), browserContext);
  const browserDefaults = JSON.parse(JSON.stringify(vm.runInContext("MASKIT_DEFAULTS", browserContext)));
  const engineDefaults = JSON.parse(JSON.stringify(require("./engine/settings").MASKIT_DEFAULTS));
  assert.deepStrictEqual(browserDefaults, engineDefaults, "Browser and engine MASKIT_DEFAULTS must stay in sync");
});
