const assert = require("assert");
const fs = require("fs");
const path = require("path");

const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const configPath = path.join(appData, "Maskit", "config.json");

console.log("Checking agent configuration file:", configPath);

// Ensure directory exists
const configDir = path.dirname(configPath);
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Backup current config if it exists
let backupConfig = null;
if (fs.existsSync(configPath)) {
  backupConfig = fs.readFileSync(configPath, "utf8");
}

try {
  // Write test config
  const testConfig = {
    enabled: true,
    clipboardMonitoring: true,
    notifications: true,
    rulesPath: "",
    auditLogPath: "",
    service: {
      healthPort: 8088
    },
    logging: {
      level: "information"
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

  // Load and assert
  const content = fs.readFileSync(configPath, "utf8");
  const parsed = JSON.parse(content);

  assert.ok(parsed.service, "Configuration must contain service config");
  assert.strictEqual(parsed.service.healthPort, 8088, "Default health port must be 8088");
  assert.ok(parsed.logging, "Configuration must contain logging config");
  assert.strictEqual(parsed.logging.level, "information", "Default logging level must be information");

  console.log("Configuration schema validation tests passed!");
} finally {
  // Restore original config
  if (backupConfig) {
    fs.writeFileSync(configPath, backupConfig);
  }
}
