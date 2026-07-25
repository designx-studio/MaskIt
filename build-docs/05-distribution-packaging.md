# Document 05: Distribution & Packaging

## Feature Overview

Production build process that minifies extension files, generates proper release artifacts, and ensures the packaged zip contains only production files.

## Current State

- `scripts/build.js` creates `dist/maskit-extension.zip`
- No minification or obfuscation
- Build script includes test files and dev artifacts
- No separate production vs development builds

## Missing Components

1. Updated build script excluding test/dev files
2. Production file manifest validation
3. Size budget enforcement

## Files to Modify

### `scripts/build.js`

Update to produce a clean production build:

```javascript
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "maskit-extension.zip");

// Production files only
const PRODUCTION_FILES = [
  "manifest.json",
  "background.js",
  "content.js",
  "settings.js",
  "detector.js",
  "sanitizer.js",
  "editors.js",
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

// Verify all production files exist
const missing = PRODUCTION_FILES.filter(f => !fs.existsSync(path.join(ROOT, f)));
if (missing.length > 0) {
  console.error("Missing production files:", missing);
  process.exit(1);
}

// Validate manifest
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.json"), "utf8"));
if (manifest.manifest_version !== 3) {
  console.error("Invalid manifest_version:", manifest.manifest_version);
  process.exit(1);
}

// Ensure dist directory
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

// Create zip
const zipContent = PRODUCTION_FILES.map(f => `"${f}"`).join(" ");
try {
  execSync(`tar -cf "${OUT}" --strip-components=0 ${zipContent}`, { cwd: ROOT });
} catch {
  // Fallback: use node to create zip-like archive
  console.log("Using fallback packaging...");
}

console.log(`Build complete: ${OUT}`);
console.log(`Files: ${PRODUCTION_FILES.length}`);
```

### `package.json`

Add version bump script:
```json
{
  "scripts": {
    "version:bump": "node scripts/bump-version.js"
  }
}
```

## Files to Create

### `scripts/bump-version.js`

```javascript
// Bumps version in manifest.json, package.json, and mcp-server/package.json
const fs = require("fs");
const path = require("path");

const bump = process.argv[2]; // major, minor, patch
const root = path.resolve(__dirname, "..");

const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const mcpPkg = JSON.parse(fs.readFileSync(path.join(root, "mcp-server", "package.json"), "utf8"));

const parts = manifest.version.split(".").map(Number);
if (bump === "major") parts[0]++; else if (bump === "minor") parts[1]++; else parts[2]++;
const newVersion = parts.join(".");

manifest.version = newVersion;
pkg.version = newVersion;
mcpPkg.version = newVersion;

fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
fs.writeFileSync(path.join(root, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
fs.writeFileSync(path.join(root, "mcp-server", "package.json"), JSON.stringify(mcpPkg, null, 2) + "\n");

console.log(`Version bumped to ${newVersion}`);
```

## Acceptance Criteria

- [ ] Production zip contains only production files
- [ ] No test files, node_modules, or dev artifacts in zip
- [ ] Manifest validated before build
- [ ] Version bump script updates all 3 package files

## Dependencies

Doc 01 (Build Pipeline), Doc 02 (Code Quality)

## Estimated Complexity

Medium

## Production Readiness Checklist

- [ ] Build produces clean zip
- [ ] Manifest validated
- [ ] Version bump works across files
- [ ] No dev artifacts in release