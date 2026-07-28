#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync, spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const pkg = require(path.join(root, "package.json"));

const extensionFiles = [
  "manifest.json",
  "settings.js",
  "browser-rules.js",
  "context-event.js",
  "detector.js",
  "sanitizer.js",
  "editors.js",
  "content.js",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "options.html",
  "options.css",
  "options.js",
  "privacy-policy.html",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png"
];

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function copyFile(relPath, destDir) {
  const src = path.join(root, relPath);
  const dest = path.join(destDir, relPath);
  if (!fs.existsSync(src)) throw new Error(`Missing required file: ${relPath}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(relDir, destDir) {
  const src = path.join(root, relDir);
  const dest = path.join(destDir, relDir);
  if (!fs.existsSync(src)) throw new Error(`Missing required directory: ${relDir}`);
  fs.cpSync(src, dest, { recursive: true });
}

function commandExists(cmd) {
  const probe = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(probe, [cmd], { encoding: "utf8" });
  return result.status === 0;
}

function zipDir(source, outZip) {
  if (fs.existsSync(outZip)) fs.unlinkSync(outZip);
  if (commandExists("zip")) {
    execFileSync("zip", ["-qr", outZip, "."], { cwd: source, stdio: "inherit" });
    return;
  }
  // Windows / environments without zip: use PowerShell Compress-Archive
  const ps = `Compress-Archive -Path (Join-Path '${source.replace(/'/g, "''")}' '*') -DestinationPath '${outZip.replace(/'/g, "''")}' -Force`;
  execFileSync("powershell", ["-NoProfile", "-Command", ps], { stdio: "inherit" });
}

function tarGz(sourceDirName, outTar) {
  if (fs.existsSync(outTar)) fs.unlinkSync(outTar);
  execFileSync("tar", ["-czf", outTar, "-C", distDir, sourceDirName], { stdio: "inherit" });
}

function writeVersionMetadata(staging, name) {
  const meta = {
    name,
    version: pkg.version,
    builtAt: new Date().toISOString(),
    schemaVersion: "1.0",
    components: {
      browserRules: "maskit-core/rules",
      eventSchema: "maskit-core/audit-schema/context-event.schema.json"
    }
  };
  fs.writeFileSync(path.join(staging, "VERSION.json"), JSON.stringify(meta, null, 2) + "\n");
}

function buildExtension(name, modifier) {
  const staging = path.join(distDir, `maskit-${name}`);
  const out = path.join(distDir, `maskit-${name}.zip`);
  rmrf(staging);
  fs.mkdirSync(staging, { recursive: true });
  extensionFiles.forEach((file) => copyFile(file, staging));
  const manifestPath = path.join(staging, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.version = pkg.version;
  if (modifier) modifier(manifest);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  writeVersionMetadata(staging, `maskit-${name}`);
  zipDir(staging, out);
  // Keep chrome staging for E2E / local load; remove others
  if (name !== "chrome") rmrf(staging);
  return out;
}

function buildMcp() {
  const staging = path.join(distDir, "maskit-mcp");
  const out = path.join(distDir, "maskit-mcp.tar.gz");
  rmrf(staging);
  fs.mkdirSync(staging, { recursive: true });
  copyDir("mcp-server", staging);
  copyDir("engine", staging);
  copyDir("maskit-core", staging);
  writeVersionMetadata(staging, "maskit-mcp");
  // Entry point at package root for clean installs
  const bootstrap = `#!/usr/bin/env node\nrequire('./mcp-server/server.js');\n`;
  fs.writeFileSync(path.join(staging, "server.js"), bootstrap);
  tarGz("maskit-mcp", out);
  rmrf(staging);
  return out;
}

function buildCli() {
  const staging = path.join(distDir, "maskit-cli");
  const out = path.join(distDir, "maskit-cli.tar.gz");
  rmrf(staging);
  fs.mkdirSync(staging, { recursive: true });
  copyDir("engine", staging);
  copyDir("maskit-core", staging);
  // Package CLI with relative requires that work outside the monorepo
  const cliSrc = fs.readFileSync(path.join(root, "mcp-server", "cli.js"), "utf8");
  const configSrc = fs.readFileSync(path.join(root, "mcp-server", "config.js"), "utf8");
  const packagedCli = cliSrc
    .replace(/require\("\.\.\/engine\/index"\)/g, 'require("./engine/index")')
    .replace(/require\("\.\.\/engine\/simulation"\)/g, 'require("./engine/simulation")')
    .replace(/require\("\.\/config"\)/g, 'require("./config")');
  const packagedConfig = configSrc.replace(
    /require\("\.\.\/engine\/settings"\)/g,
    'require("./engine/settings")'
  );
  fs.writeFileSync(path.join(staging, "cli.js"), packagedCli);
  fs.writeFileSync(path.join(staging, "config.js"), packagedConfig);
  writeVersionMetadata(staging, "maskit-cli");
  tarGz("maskit-cli", out);
  rmrf(staging);
  return out;
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function writeChecksums(files) {
  const lines = files.map((file) => {
    const full = path.join(distDir, file);
    return `${sha256File(full)}  ${file}`;
  });
  fs.writeFileSync(path.join(distDir, "SHA256SUMS.txt"), lines.join("\n") + "\n");
  fs.writeFileSync(
    path.join(distDir, "RELEASE-METADATA.json"),
    JSON.stringify(
      {
        version: pkg.version,
        builtAt: new Date().toISOString(),
        artifacts: files,
        schemaVersion: "1.0",
        notes: "Production release candidate artifacts. Browser ZIPs are Manifest V3 with shared maskit-core rules."
      },
      null,
      2
    ) + "\n"
  );
}

// Generate browser rules from maskit-core before packaging
execFileSync(process.execPath, [path.join(__dirname, "generate-browser-rules.js")], { stdio: "inherit" });

rmrf(distDir);
fs.mkdirSync(distDir, { recursive: true });

buildExtension("chrome");
buildExtension("edge");
buildExtension("opera");
buildExtension("firefox", (manifest) => {
  manifest.browser_specific_settings = {
    gecko: { id: "maskit@maskit.local", strict_min_version: "109.0" }
  };
});
buildExtension("extension");
buildMcp();
buildCli();

const artifacts = [
  "maskit-chrome.zip",
  "maskit-edge.zip",
  "maskit-firefox.zip",
  "maskit-opera.zip",
  "maskit-extension.zip",
  "maskit-cli.tar.gz",
  "maskit-mcp.tar.gz"
];

// Windows agent (optional on hosts without .NET 8 SDK; required in CI release jobs)
let windowsBuilt = false;
try {
  execFileSync(process.execPath, [path.join(__dirname, "build-windows-agent.js")], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  if (fs.existsSync(path.join(distDir, "maskit-windows-agent.zip"))) {
    artifacts.push("maskit-windows-agent.zip");
    windowsBuilt = true;
  }
} catch (error) {
  const code = error && error.status;
  if (code === 2) {
    console.warn("Windows agent package skipped: .NET SDK not available on this host.");
  } else {
    console.warn(`Windows agent package build failed (continuing browser/CLI/MCP release set): ${error.message || error}`);
  }
}

writeChecksums(artifacts);
console.log(
  windowsBuilt
    ? "Built browser, CLI, MCP, and Windows agent artifacts with SHA-256 checksums."
    : "Built browser, CLI, and MCP artifacts with SHA-256 checksums (Windows agent not included)."
);
