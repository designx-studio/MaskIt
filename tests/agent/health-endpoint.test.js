const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const dns = require("dns");

const appData = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.config');
const configPath = path.join(appData, "Maskit", "config.json");

// Find executable
const agentPaths = [
  path.resolve(__dirname, "../../dist/maskit-windows-agent/publish/MaskIt.Agent.exe"),
  path.resolve(__dirname, "../../maskit-agent/Maskit.Agent/bin/Debug/net8.0-windows/MaskIt.Agent.exe"),
  path.resolve(__dirname, "../../maskit-agent/Maskit.Agent/bin/Release/net8.0-windows/win-x64/MaskIt.Agent.exe")
];

let agentExe = null;
for (const p of agentPaths) {
  if (fs.existsSync(p)) {
    agentExe = p;
    break;
  }
}

if (!agentExe) {
  console.warn("MaskIt.Agent.exe not built yet. Skipping health-endpoint integration test.");
  process.exit(0);
}

console.log("Found agent binary for test:", agentExe);

// Backup config
let originalConfig = null;
if (fs.existsSync(configPath)) {
  originalConfig = fs.readFileSync(configPath, "utf8");
}

const testPort = 8089;

// Configure custom port for testing to avoid conflicts
const testConfig = {
  enabled: true,
  clipboardMonitoring: false, // disable to prevent modifying clipboard during test
  notifications: false,
  rulesPath: path.resolve(__dirname, "../../maskit-core/rules"),
  service: {
    healthPort: testPort
  },
  logging: {
    level: "information"
  }
};

fs.writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

// Start the agent in the background (using --test-health mode)
console.log(`Spawning agent in tray/headless mode on port ${testPort}...`);
const child = spawn(agentExe, ["--test-health"], {
  stdio: "pipe",
  detached: false
});

child.stdout.on("data", (data) => {
  console.log("AGENT STDOUT:", data.toString().trim());
});

child.stderr.on("data", (data) => {
  console.log("AGENT STDERR:", data.toString().trim());
});

child.on("error", (err) => {
  console.error("Failed to start agent:", err);
  restoreConfig();
  process.exit(1);
});

function restoreConfig() {
  if (originalConfig) {
    fs.writeFileSync(configPath, originalConfig);
  } else {
    try { fs.unlinkSync(configPath); } catch {}
  }
}

// Helper to make GET requests
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data}`));
        }
      });
    }).on("error", reject);
  });
}

// Wait for service to boot
setTimeout(async () => {
  try {
    console.log("Querying http://127.0.0.1:8089/health ...");
    const res = await getJson(`http://127.0.0.1:${testPort}/health`);
    
    assert.strictEqual(res.statusCode, 200, "Health status should be 200 OK");
    assert.ok(res.headers["content-type"].includes("application/json"), "Content-type must be application/json");
    
    const body = res.body;
    assert.strictEqual(body.status, "active");
    assert.strictEqual(body.version, "2.4.0");
    assert.strictEqual(body.policyVersion, "default");
    assert.ok(typeof body.rulesLoaded === "number", "rulesLoaded must be a number");
    assert.ok(body.rulesLoaded > 0, "rulesLoaded must be > 0");
    assert.ok(typeof body.uptime === "number", "uptime must be a number");
    
    // Ensure no sensitive clipboard or private values exist in output keys
    const keys = Object.keys(body);
    const forbidden = ["clipboard", "value", "prompt", "text", "history", "secret", "user"];
    forbidden.forEach(fk => {
      assert.ok(!keys.includes(fk), `Sensitive key ${fk} must not be exposed`);
    });

    console.log("Schema validation succeeded! Operational health details verified.");

    // Verify non-loopback interface access is blocked (e.g. binding to external LAN IP)
    console.log("Testing non-loopback IP security binding...");
    let lanIp = null;
    const os = require("os");
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
      for (const alias of interfaces[devName]) {
        if (alias.family === "IPv4" && !alias.internal) {
          lanIp = alias.address;
          break;
        }
      }
      if (lanIp) break;
    }

    if (lanIp) {
      console.log(`Verifying connection is refused on LAN IP: http://${lanIp}:${testPort}/health`);
      try {
        await getJson(`http://${lanIp}:${testPort}/health`);
        assert.fail("Endpoint should not respond to LAN IP (should be loopback-only)");
      } catch (err) {
        assert.ok(
          err.message.includes("ECONNREFUSED") || err.message.includes("EADDRNOTAVAIL") || err.message.includes("ECONNRESET"),
          `Expected connection error on LAN IP: ${err.message}`
        );
        console.log("Loopback-only binding check passed (LAN IP connection refused successfully).");
      }
    } else {
      console.log("No active LAN IP interface found to verify external binding; skipping.");
    }

    // Stop agent and clean up
    child.kill("SIGTERM");
    restoreConfig();
    console.log("Health service endpoint tests passed!");
    process.exit(0);

  } catch (err) {
    console.error("Test failed:", err);
    child.kill("SIGTERM");
    restoreConfig();
    process.exit(1);
  }
}, 3000);
