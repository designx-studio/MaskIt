#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const pkg = require(path.join(root, "package.json"));

const includePaths = [
  "manifest.json",
  "settings.js",
  "detector.js",
  "sanitizer.js",
  "editors.js",
  "content.js",
  "background.js",
  "ai-intercept.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "options.html",
  "options.css",
  "options.js",
  "privacy-policy.html",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

const includeDirs = [
  "engine",
  "mcp-server"
];

function rmrf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyFile(relPath, destDir) {
  const src = path.join(root, relPath);
  const dest = path.join(destDir, relPath);

  if (!fs.existsSync(src)) {
    throw new Error(`Missing required file: ${relPath}`);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(relDir, destDir) {
  const srcDir = path.join(root, relDir);
  const destDirFull = path.join(destDir, relDir);

  if (!fs.existsSync(srcDir)) return;

  fs.mkdirSync(destDirFull, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDirFull, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createZip(stagingDir, outZip) {
  if (process.platform === "win32") {
    // Use .NET's ZipFile.CreateFromDirectory which handles subdirectories correctly
    execSync(
      `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${stagingDir}', '${outZip}', [System.IO.Compression.CompressionLevel]::Optimal, $false)"`,
      { stdio: "inherit" }
    );
  } else {
    execSync(`cd "${stagingDir}" && zip -r "${outZip}" .`, { stdio: "inherit" });
  }
}

function buildPackage(name, manifestModifier) {
  const stagingDir = path.join(distDir, `maskit-${name}`);
  const outZip = path.join(distDir, `maskit-${name}.zip`);

  rmrf(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  // Copy all files
  includePaths.forEach((p) => copyFile(p, stagingDir));
  includeDirs.forEach((d) => copyDir(d, stagingDir));

  // Inject version from package.json (single source of truth)
  const manifestPath = path.join(stagingDir, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.version = pkg.version;
  if (manifestModifier) {
    manifestModifier(manifest);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  // Create zip
  createZip(stagingDir, outZip);

  const sizeKb = Math.round(fs.statSync(outZip).size / 1024);
  console.log(`  ${name}: ${outZip} (${sizeKb} KB)`);

  // Clean up staging dir
  rmrf(stagingDir);
}

// ── Main ─────────────────────────────────────────────────────────────────

rmrf(distDir);
fs.mkdirSync(distDir, { recursive: true });

console.log("\nBuilding Maskit packages...\n");

// 1. Chrome (default manifest)
buildPackage("chrome", null);

// 2. Edge (same as Chrome — Chromium-based)
buildPackage("edge", null);

// 3. Opera (same as Chrome — Chromium-based)
buildPackage("opera", null);

// 4. Firefox (MV3 with gecko settings)
buildPackage("firefox", (manifest) => {
  // Firefox needs gecko ID and strict_min_version
  manifest.browser_specific_settings = {
    gecko: {
      id: "maskit@maskit.local",
      strict_min_version: "109.0"
    }
  };
  // Firefox uses browser.* API — no changes needed since chrome.* works as alias
});

// Also create the legacy combined zip for backward compatibility
buildPackage("extension", null);

console.log("\nAll packages built in dist/");
console.log("Chrome:      dist/maskit-chrome.zip");
console.log("Edge:        dist/maskit-edge.zip");
console.log("Firefox:     dist/maskit-firefox.zip");
console.log("Opera:       dist/maskit-opera.zip");
console.log("Legacy:      dist/maskit-extension.zip");
console.log("\nUpload to:");
console.log("  Chrome: https://chrome.google.com/webstore/devconsole");
console.log("  Edge:   https://partner.microsoft.com/dashboard/microsoftedge");
console.log("  Firefox: https://addons.mozilla.org/developers/addon");
console.log("  Opera:  https://addons.opera.com/developers/addons");
