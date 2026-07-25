# Changelog

All notable changes to Maskit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

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