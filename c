#!/usr/bin/env node
/**
 * Validates manifest.json against basic schema requirements.
 * Run: node scripts/validate-manifests.js
 */

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

let passed = 0;
let failed = 0;

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log("  PASS  " + name);
    } catch (err) {
        failed++;
        console.error("  FAIL  " + name);
        console.error("        " + err.message);
    }
}

console.log("\nManifest validation tests\n");

// Validate source manifest
check("manifest.json is valid JSON", () => {
    const raw = fs.readFileSync(path.join(root, "manifest.json"), "utf8");
    JSON.parse(raw);
});

check("manifest.json has manifest_version 3", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (manifest.manifest_version !== 3) throw new Error("Expected manifest_version 3");
});

check("manifest.json has name", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!manifest.name) throw new Error("Missing name");
});

check("manifest.json has version", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!manifest.version) throw new Error("Missing version");
});

check("manifest.json has permissions array", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!Array.isArray(manifest.permissions)) throw new Error("Missing permissions array");
});

check("manifest.json has host_permissions", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!Array.isArray(manifest.host_permissions)) throw new Error("Missing host_permissions");
});

check("manifest.json has content_scripts", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!Array.isArray(manifest.content_scripts)) throw new Error("Missing content_scripts");
});

check("manifest.json content_scripts match <all_urls>", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    const hasAllUrls = manifest.content_scripts.some(cs =>
        cs.matches && cs.matches.includes("<all_urls>")
    );
    if (!hasAllUrls) throw new Error("No content script matching <all_urls>");
});

check("manifest.json has background service_worker", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!manifest.background?.service_worker) throw new Error("Missing background.service_worker");
});

check("manifest.json has action with popup", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!manifest.action?.default_popup) throw new Error("Missing action.default_popup");
});

check("manifest.json has icons", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!manifest.icons?.["128"]) throw new Error("Missing icons.128");
});

check("manifest.json has commands", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!manifest.commands?.["toggle-protection"]) throw new Error("Missing toggle-protection command");
});

check("manifest.json has context_menus", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!Array.isArray(manifest.context_menus)) throw new Error("Missing context_menus");
});

check("manifest.json has browser_specific_settings for Firefox", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    if (!manifest.browser_specific_settings?.gecko?.id) throw new Error("Missing gecko id");
});

check("manifest.json all content script files exist", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    for (const cs of manifest.content_scripts) {
        for (const jsFile of cs.js) {
            const filePath = path.join(root, jsFile);
            if (!fs.existsSync(filePath)) throw new Error("Missing file: " + jsFile);
        }
    }
});

check("manifest.json all icon files exist", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
    for (const size of ["16", "48", "128"]) {
        const iconPath = manifest.icons?.[size];
        if (!iconPath) continue;
        const filePath = path.join(root, iconPath);
        if (!fs.existsSync(filePath)) throw new Error("Missing icon: " + iconPath);
    }
});

console.log("\n" + passed + " passed, " + failed + " failed\n");
process.exit(failed > 0 ? 1 : 0);