# Maskit Desktop + Browser — Implementation Plan

**Product:** Maskit — local-first privacy layer that stops sensitive text from leaving your device in ChatGPT, Gmail, Claude Desktop, and IDEs.
**Date:** July 25, 2026
**Status:** v1 Complete — all phases delivered and verified

---

## Current State Assessment

The codebase is a **production-ready Chrome MV3 extension** (v2.3.0) with a shared detection engine and MCP server for Claude Desktop.

### v1 Delivered Features

✅ Shared detection engine (`engine/`) — standalone Node.js module
✅ 9 built-in detection types + 30+ cloud key patterns
✅ Risk scoring (0–100) with severity mapping
✅ Redaction formats: tagged, stars, custom
✅ False-positive guards (Luhn, M-Pesa, IP, passport, API key)
✅ Custom regex rules (validated, max 15)
✅ Paste/copy/typing interception on ChatGPT + Gmail
✅ ON/PAUSED/OFF tri-state badge + traffic light widget
✅ Review-before-redact modal
✅ Site allowlist/blocklist, per-site toggle
✅ Pause with auto-resume (configurable timeout)
✅ Import/export settings, keyboard shortcuts
✅ Privacy-first: no raw data uploads, narrow host permissions
✅ MCP server for Claude Desktop (6 tools, stdio transport)
✅ OS-specific config file management
✅ 102 passing tests (52 engine + 32 extension + 18 MCP)
✅ Documentation: BUILD.md, SECURITY.md, FEATURES.md, mcp-server/README.md

### v2/v3 Items (Deferred)

- HTTP server for custom integrations
- CLI tool for scripts
- Cursor / IDE-specific support
- Discord/Slack bot integrations
- GitHub Action integration
- Express.js middleware
- Shared config import/export between browser and MCP server
- Enterprise and fleet features

---

## Build Phases — v1 Completion Status

### Phase 1: Shared Detection Engine ✅

| # | Task | Status |
|---|------|--------|
| 1.1 | Create `engine/settings.js` — settings with severity config | ✅ Complete |
| 1.2 | Create `engine/detector.js` — risk scoring, expanded cloud keys | ✅ Complete |
| 1.3 | Create `engine/index.js` — public API wrapper | ✅ Complete |
| 1.4 | Create `engine/test.js` — 52 tests | ✅ 52 passed |
| 1.5 | Run tests, verify all pass | ✅ All pass |

### Phase 2: Chrome Extension Integration ✅

| # | Task | Status |
|---|------|--------|
| 2.1 | Wire extension to shared engine | ✅ Complete |
| 2.2 | Confirm ChatGPT and Gmail support | ✅ Working |
| 2.3 | Traffic light widget, pause, settings | ✅ Working |
| 2.4 | Browser extension tests (32+) | ✅ 32 passed |

### Phase 3: MCP Server ✅

| # | Task | Status |
|---|------|--------|
| 3.1 | Create `mcp-server/package.json` | ✅ Complete |
| 3.2 | Create `mcp-server/config.js` — OS-specific config | ✅ Complete |
| 3.3 | Create `mcp-server/server.js` — 6 tools, stdio | ✅ Complete |
| 3.4 | Create `mcp-server/test.js` — 18 tests | ✅ 18 passed |
| 3.5 | Create `mcp-server/claude-desktop.json` | ✅ Complete |
| 3.6 | Create `mcp-server/README.md` | ✅ Complete |

### Phase 4: Documentation ✅

| # | Task | Status |
|---|------|--------|
| 4.1 | Complete `BUILD.md` | ✅ Complete |
| 4.2 | Complete `SECURITY.md` | ✅ Complete |
| 4.3 | Complete `mcp-server/README.md` | ✅ Complete |
| 4.4 | Complete `FEATURES.md` | ✅ Complete |
| 4.5 | Update `PRD.md` | ✅ Complete |

### Phase 5: Polish ✅

| # | Task | Status |
|---|------|--------|
| 5.1 | Run full test suite (93+ required) | ✅ 102 passed |
| 5.2 | Verify all acceptance criteria | ✅ All met |
| 5.3 | Update PLAN.md | ✅ This document |
| 5.4 | Fix documentation inconsistencies | ✅ Fixed |

---

## Acceptance Criteria — Verification

### Engine (8.1)
- [x] `scanText()` returns findings, `redactedText`, `riskScore`, `riskLevel`, `matchedRules`
- [x] `redactText()` returns `redactedText` and findings
- [x] `evaluatePolicy()` returns `allowed`, findings, `riskScore`, reason
- [x] Risk score caps at 100
- [x] Severity levels weighted and mapped consistently
- [x] All v1 detection types with false-positive guards
- [x] Custom regex rules validated for length and safety
- [x] 50+ tests passing (52 passed)

### Browser Extension (8.2)
- [x] Scans paste, copy, and typing events
- [x] Works on ChatGPT and Gmail
- [x] ON / PAUSED / OFF badge updates correctly
- [x] Traffic light widget shows status
- [x] Review-before-redact dialog works
- [x] Site allowlist / blocklist works
- [x] Pause with auto-resume works
- [x] Settings save and load correctly
- [x] No network requests for content scanning
- [x] 28+ tests passing (32 passed)

### MCP Server (8.3)
- [x] Six tools registered and callable
- [x] Stdio transport works with Claude Desktop
- [x] Config file read/write works
- [x] 15+ tests passing (18 passed)
- [x] Claude Desktop can discover and invoke tools

---

## Test Results Summary

| Suite | Required | Actual | Status |
|-------|----------|--------|--------|
| Engine (`engine/test.js`) | 50+ | 52 | ✅ All pass |
| Browser (`test.js`) | 28+ | 32 | ✅ All pass |
| MCP Server (`mcp-server/test.js`) | 15+ | 18 | ✅ All pass |
| **Total** | **93+** | **102** | ✅ **All pass** |

---

## Directory Structure

```
maskit-extension/
├── manifest.json          # Extension manifest (MV3)
├── settings.js            # Browser defaults, site-list helpers
├── detector.js            # Browser detection engine
├── sanitizer.js           # Browser redaction logic
├── editors.js             # ChatGPT/Gmail editor support
├── content.js             # Page-level event handlers
├── background.js          # Service worker
├── popup.html / .css / .js
├── options.html / .css / .js
├── privacy-policy.html
├── engine/                # Shared detection engine (Node.js)
│   ├── index.js           # Public API
│   ├── detector.js        # Patterns & redaction
│   ├── settings.js        # Settings & regex safety
│   └── test.js            # 52 tests
├── mcp-server/            # MCP server for Claude Desktop
│   ├── server.js          # 6 tools, stdio transport
│   ├── config.js          # OS-specific config
│   ├── package.json
│   ├── claude-desktop.json
│   ├── README.md
│   ├── test.js            # 18 tests
│   ├── http-server.js     # v2: HTTP mode
│   ├── cli.js             # v2: CLI tool
│   └── integrations/      # v2: Example scripts
├── scripts/
│   ├── build.js
│   ├── generate-icons.js
│   └── maskit-scan.sh
├── website/               # Landing page + demo
├── icons/
├── test.js                # 32 browser extension tests
├── BUILD.md
├── SECURITY.md
├── FEATURES.md
├── PRD.md
└── PLAN.md               # This document
```

---

## Non-Goals (v1)

- Fleet management
- Cloud account monitoring
- SIEM replacement
- EDR functionality
- Multi-tenant admin console
- Complex compliance reporting
- HTTP server mode
- CLI tool
- Bot integrations
- Enterprise policy sync

---

## Success Criteria

- ✅ Users can protect data in ChatGPT, Gmail, and Claude Desktop
- ✅ Redaction happens locally and reliably (no cloud inference)
- ✅ Product is understandable: "Maskit is a local-first privacy layer that stops sensitive text from leaving your device"
- ✅ Users trust the privacy model (no raw data uploads, transparent config)
- ✅ 102 tests pass (exceeds 93+ requirement)
- ✅ Chrome permissions stay minimal and privacy-friendly