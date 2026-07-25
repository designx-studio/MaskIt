#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const outZip = path.join(distDir, "maskit-extension.zip");

const includePaths = [
  "manifest.json",
  "settings.js",
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
  "SECURITY.md",
  "icons/icon16.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

const includeDirs = [
  "engine",
  "mcp-server"
];

const stagingDir = path.join(distDir, "maskit-extension");

function rmrf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyFile(relPath) {
  const src = path.join(root, relPath);
  const dest = path.join(stagingDir, relPath);

  if (!fs.existsSync(src)) {
    throw new Error(`Missing required file: ${relPath}`);
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(relDir) {
  const srcDir = path.join(root, relDir);
  const destDir = path.join(stagingDir, relDir);

  if (!fs.existsSync(srcDir)) return;

  fs.mkdirSync(destDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function createZip() {
  rmrf(distDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  includePaths.forEach(copyFile);
  includeDirs.forEach(copyDir);

  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${outZip}' -Force"`,
      { stdio: "inherit" }
    );
  } else {
    execSync(`cd "${stagingDir}" && zip -r "${outZip}" .`, { stdio: "inherit" });
  }

  const sizeKb = Math.round(fs.statSync(outZip).size / 1024);
  console.log(`\nChrome Web Store package ready: ${outZip} (${sizeKb} KB)`);
  console.log("Upload this zip at https://chrome.google.com/webstore/devconsole");
}

createZip();
