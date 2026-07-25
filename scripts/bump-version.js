#!/usr/bin/env node
/**
 * Bumps version across all project files.
 * Usage: node scripts/bump-version.js [major|minor|patch]
 */
const fs = require("fs");
const path = require("path");

const bump = process.argv[2];
if (!["major", "minor", "patch"].includes(bump)) {
    console.error("Usage: node scripts/bump-version.js [major|minor|patch]");
    process.exit(1);
}

const root = path.resolve(__dirname, "..");

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const mcpPkg = JSON.parse(fs.readFileSync(path.join(root, "mcp-server", "package.json"), "utf8"));

const parts = manifest.version.split(".").map(Number);
if (bump === "major") parts[0]++;
else if (bump === "minor") parts[1]++;
else parts[2]++;

const newVersion = parts.join(".");

manifest.version = newVersion;
pkg.version = newVersion;
mcpPkg.version = newVersion;

fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
fs.writeFileSync(path.join(root, "mcp-server", "package.json"), JSON.stringify(mcpPkg, null, 2) + "\n");

console.log(`Version bumped: ${manifest.version} → ${newVersion}`);