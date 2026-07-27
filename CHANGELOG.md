# Changelog

All notable changes to Maskit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [2.4.0] - 2026-07-26

### Added
- **Structured Audit Log** — Event-based schema replacing stat counters. Each redaction/block/allow creates a structured event with type, severity, source, app, action, riskScore, timestamp, and policyApplied
- **Role-Based Policies** — Per-app/context policy overrides. Set different rules for ChatGPT, Claude Desktop, Gmail, local AI, etc. (allow/redact/block per data type)
- **Safe Unmasking** — Deterministic token generation for auditable unmasking. Show original values for 30s with full audit trail. No raw values stored
- **Config Sync (Browser ↔ MCP)** — Export/import settings between browser extension and MCP server via JSON files
- **Response Scanning (MCP)** — New `scan_response` tool scans AI responses for leaked credentials and reconstructed secrets
- **AI Killswitch (Phase 5)** — Enterprise admin control to disable all AI tools. Supports indefinite, time-limited, and schedule-based restrictions. Enforced in browser extension (paste/typing blocked), MCP server (tools return error), with custom admin messages
- **Killswitch Exemptions** — Per-user/group exemptions from killswitch restrictions (Phase 5.3 foundation)
- **Audit Log UI** — Filterable table in Options page with type/action filters, CSV export, and configurable retention
- **Policy Editor UI** — Visual editor for role-based policies with per-data-type action selectors (allow/redact/block)
- **MCP Server `get_audit_log` tool** — API surface for future central audit sync
- **133 automated tests** (83 engine + 32 extension + 18 MCP) — up from 102

### Changed
- Engine version bumped to 2.4.0
- `scanText()` now returns `events`, `policyDecisions`, `allFindings` alongside existing fields
- `evaluatePolicy()` now returns `blocked`, `redacted`, `allowedByPolicy` counts
- `redactText()` now applies policy decisions (allow items are not redacted)
- MCP server now has 6 tools
- Options page now includes Audit Log, Role-Based Policies, and Config Sync sections
- Background script manages audit log storage with automatic pruning

### Architecture
- Added `KILLSWITCH_DEFAULTS`, `isAIToolsAllowed()`, `parseTime()`, `isUserExempt()` to engine settings
- Added `AUDIT_LOG_DEFAULTS`, `createAuditEvent()`, `hashSensitive()`, `pruneAuditLog()` to engine settings
- Added `MASKIT_POLICY_DEFAULTS`, `selectPolicy()`, `getPolicyAction()` to engine settings
- Killswitch enforcement added to `content.js` (paste/beforeinput handlers) and MCP server

## [2.3.0] - 2026-07-25

### Added
- Shared detection engine (`engine/`) — standalone Node.js module
- MCP server for Claude Desktop (`mcp-server/`) — 6 tools, stdio transport
- Risk scoring (0-100) with severity mapping
- Expanded cloud key detection (30+ patterns)
- 102 automated tests (52 engine + 32 extension + 18 MCP)

### Changed
- Updated test script to run all 3 test suites
- Updated BUILD.md with engine and MCP server documentation
- Version synced across manifest.json, package.json, mcp-server/package.json

## [2.2.0] - 2026-07-01

### Added
- Security hardening for public release
- Narrow host permissions (ChatGPT + Gmail only)
- Regex safety validation for custom rules
- XSS fixes in UI rendering

### Changed
- Stats tracking uses counts only, never raw values

## [2.1.0] - 2026-06-15

### Added
- ChatGPT/Gmail editor stabilization
- False-positive validators (Luhn, M-Pesa, IP, passport)
- Toolbar badge (ON/OFF)
- Chrome Web Store build script
- Landing page and HTML demo

## [2.0.0] - 2026-06-01

### Added
- Copy interception
- Typing scan with debounce
- 9 data type detectors
- Custom regex rules
- Site allowlist/blocklist
- Review-before-redact dialog
- Toolbar popup with stats
- Settings page with import/export
- Keyboard shortcuts (Alt+Shift+M, Alt+Shift+P)
- ON/PAUSED/OFF tri-state badge
- Traffic light widget (Shadow DOM)
- Pause with auto-resume

## [1.0.1] - 2026-05-15

### Fixed
- Async paste bug
- Broadened site access
- Improved contenteditable support

## [1.0.0] - 2026-05-01

### Added
- Initial release
- Paste detection for email, phone, card, M-Pesa
- ChatGPT and Gmail support