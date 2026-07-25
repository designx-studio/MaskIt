# Document 06: Legal & Compliance

## Feature Overview

Add required legal files (LICENSE, CHANGELOG) and Chrome Web Store compliance artifacts.

## Current State

- `privacy-policy.html` exists (CWS privacy policy page)
- No LICENSE file
- No CHANGELOG.md
- No CONTRIBUTING.md

## Missing Components

1. LICENSE file
2. CHANGELOG.md
3. CONTRIBUTING.md

## Files to Create

### `LICENSE`

MIT License:

```
MIT License

Copyright (c) 2026 Maskit Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### `CHANGELOG.md`

```markdown
# Changelog

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

## [1.0.0] - 2026-05-01

### Added
- Initial release
- Paste detection for email, phone, card, M-Pesa
- ChatGPT and Gmail support
```

### `CONTRIBUTING.md`

```markdown
# Contributing to Maskit

## Development Setup

1. Clone the repository
2. Load as unpacked extension in Chrome
3. Run `npm install`
4. Run `npm test`

## Code Style

- No eval() or Function constructor
- Use const/let, not var
- Strict equality (===)
- Content scripts must fail silently (never break host pages)

## Testing

- Engine: `node engine/test.js`
- Extension: `node test.js`
- MCP Server: `node mcp-server/test.js`
- All: `npm test`

## Pull Requests

1. Create a feature branch
2. Add tests for new functionality
3. Ensure all tests pass
4. Update documentation if needed
5. Submit PR with clear description
```

## Acceptance Criteria

- [ ] LICENSE file exists
- [ ] CHANGELOG.md documents all versions
- [ ] CONTRIBUTING.md guides contributors

## Dependencies

None.

## Estimated Complexity

Small

## Production Readiness Checklist

- [ ] LICENSE is MIT (or chosen license)
- [ ] CHANGELOG covers all versions
- [ ] CONTRIBUTING.md is complete