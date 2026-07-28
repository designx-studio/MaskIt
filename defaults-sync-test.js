const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const browserContext = { console, RegExp, String, Object, Array, Set, Math, Date };
vm.createContext(browserContext);
vm.runInContext(fs.readFileSync(path.join(__dirname, "settings.js"), "utf8"), browserContext);
const browserDefaults = vm.runInContext("MASKIT_DEFAULTS", browserContext);
const engineDefaults = require("./engine/settings").MASKIT_DEFAULTS;
assert.deepStrictEqual(browserDefaults, engineDefaults, "Browser and engine MASKIT_DEFAULTS must stay in sync");
console.log("Maskit browser and engine defaults are in sync");
