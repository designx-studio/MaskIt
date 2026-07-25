# Maskit

**Prevent accidental data leaks before sensitive text leaves your device.**

Maskit is a local-first privacy layer that detects and redacts sensitive data in real time. It works in ChatGPT, Gmail, and Claude Desktop — catching emails, API keys, credit cards, SSNs, and more before they leave your device.

![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-102%20passing-brightgreen)
![Version](https://img.shields.io/badge/version-2.3.0-blue)
![Chrome](https://img.shields.io/badge/Chrome-MV3-yellow)

---

## Why Maskit?

Users paste customer data, API keys, secrets, and regulated information into AI tools and email without realizing the risk. Existing solutions are cloud-dependent, enterprise-only, or too broad.

**Maskit solves this by:**
- Scanning text at paste, copy, and typing time
- Detecting sensitive patterns locally (no cloud processing)
- Redacting data before it leaves your device
- Being invisible when everything is safe

> *"Maskit is a local-first privacy layer that stops sensitive text from leaving your device."*

---

## Quick Start

### Chrome Extension

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `maskit-extension` folder
5. Navigate to ChatGPT or Gmail — Maskit is active automatically

### Claude Desktop (MCP Server)

1. Install dependencies:
   ```bash
   cd mcp-server && npm install
   ```

2. Add to your `claude_desktop_config.json`:
   ```json
   {
     "mcpServers": {
       "maskit": {
         "command": "node",
         "args": ["/path/to/maskit-extension/mcp-server/server.js"]
       }
     }
   }
   ```

3. Restart Claude Desktop — 6 tools are automatically available

---

## What It Detects

| Type | Examples | Severity |
|------|----------|----------|
| **API Keys** | OpenAI `sk-...`, GitHub `ghp_...`, AWS `AKIA...`, Google `AIza...`, Stripe `sk_live_...`, Bearer tokens, and 30+ more | Critical |
| **Credit Cards** | `4111 1111 1111 1111` (Luhn validated) | Critical |
| **SSNs** | `123-45-6789` | Critical |
| **Bank Accounts (IBAN)** | `GB82WEST12345698765432` | Critical |
| **Passports** | `AB1234567` | High |
| **IP Addresses** | `192.168.1.1` | High |
| **Emails** | `john@example.com` | Medium |
| **Phone Numbers** | `+254712345678`, `0712345678` | Medium |
| **M-Pesa Codes** | `QKA12X9L4M` | Low |

Plus **custom regex rules** you define yourself (up to 15).

---

## Features

### Chrome Extension

- **Paste interception** — Redacts sensitive data when pasting
- **Copy interception** — Redacts clipboard contents when copying
- **Typing scan** — Detects sensitive patterns as you type
- **Review dialog** — Optional confirmation before redacting
- **Traffic light widget** — Visual status indicator (green/amber/red)
- **Pause/resume** — Temporary pause with auto-resume (configurable)
- **Site allowlist/blocklist** — Control which sites are protected
- **Settings page** — Full configuration with import/export
- **Keyboard shortcuts** — `Alt+Shift+M` toggle, `Alt+Shift+P` pause

### MCP Server (Claude Desktop)

6 tools available to Claude Desktop and MCP-capable apps:

| Tool | Description |
|------|-------------|
| `scan_text` | Scan text for sensitive data, returns findings + risk score |
| `redact_text` | Scan and redact, returns cleaned text |
| `evaluate_policy` | Evaluate text against policy, returns allowed/denied |
| `get_status` | Engine version, config path, rules count |
| `get_rules` | List all active rules with severity levels |
| `update_rules` | Add or replace custom regex rules |

### Shared Engine

The detection engine works across both surfaces:

```javascript
const { scanText, redactText, evaluatePolicy } = require("./engine/index");

const result = scanText("Contact john@example.com, SSN 123-45-6789");
// result.findings     → [{ type: "EMAIL", value: "john@example.com", severity: "medium" }, ...]
// result.riskScore    → 10
// result.riskLevel    → "medium"
// result.redactedText → "Contact [EMAIL_REDACTED], SSN [SSN_REDACTED]"
```

---

## Architecture

```
engine/index.js (shared core)
       |
  +----+----------------+
  |                     |
browser extension    mcp-server/
(chrome MV3)         (Claude Desktop)
```

**One detection engine, multiple surfaces. All local. No cloud.**

| Component | Description |
|-----------|-------------|
| `engine/` | Shared detection engine (Node.js) — patterns, risk scoring, redaction |
| `content.js` | Browser content script — event handlers, traffic light, review dialog |
| `background.js` | Service worker — badge, shortcuts, pause state |
| `mcp-server/` | MCP server — 6 tools via stdio transport |

---

## Project Structure

```
maskit-extension/
├── manifest.json              # Extension manifest (MV3)
├── content.js                 # Content script (event handlers)
├── background.js              # Service worker
├── settings.js                # Browser settings
├── detector.js                # Browser detection engine
├── sanitizer.js               # Browser redaction
├── editors.js                 # ChatGPT/Gmail editor support
├── popup.html / popup.js      # Toolbar popup
├── options.html / options.js  # Settings page
├── engine/                    # Shared detection engine
│   ├── index.js               # Public API
│   ├── detector.js            # Patterns & redaction
│   ├── settings.js            # Settings & regex safety
│   └── test.js                # 52 tests
├── mcp-server/                # MCP server for Claude Desktop
│   ├── server.js              # 6 tools, stdio transport
│   ├── config.js              # OS-specific config
│   ├── test.js                # 18 tests
│   └── README.md              # Setup guide
├── icons/                     # Extension icons
├── scripts/                   # Build & utility scripts
├── website/                   # Landing page
└── test.js                    # 32 browser extension tests
```

---

## Development

### Prerequisites

- Google Chrome (MV3 support)
- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/designx-studio/MaskIt.git
cd MaskIt
npm test
```

### Run Tests

```bash
npm test                    # All suites (102 tests)
node engine/test.js         # Engine only (52 tests)
node test.js                # Extension only (32 tests)
node mcp-server/test.js     # MCP server only (18 tests)
```

### Build for Chrome Web Store

```bash
npm run build
# Creates dist/maskit-extension.zip
```

### Version Bump

```bash
node scripts/bump-version.js patch   # 2.3.0 → 2.3.1
node scripts/bump-version.js minor   # 2.3.0 → 2.4.0
node scripts/bump-version.js major   # 2.3.0 → 3.0.0
```

---

## Privacy

Maskit is built privacy-first:

- **Local-only processing** — No data leaves your device
- **No network requests** — Content scanning happens entirely in the browser
- **No sensitive data stored** — Only counts and settings are saved
- **Narrow permissions** — Only ChatGPT and Gmail (no broad host access)
- **No analytics or telemetry** — We don't track you

See [SECURITY.md](SECURITY.md) for the full threat model and data handling details.

---

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | Save settings and statistics |
| `chatgpt.com` | Content script injection on ChatGPT |
| `chat.openai.com` | Content script injection on ChatGPT (legacy) |
| `mail.google.com` | Content script injection on Gmail |

No network, clipboard, or tabs permissions. Clipboard access uses in-event `clipboardData` during paste/copy handlers.

---

## Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| Engine (`engine/test.js`) | 52 | ✅ All pass |
| Browser (`test.js`) | 32 | ✅ All pass |
| MCP Server (`mcp-server/test.js`) | 18 | ✅ All pass |
| **Total** | **102** | **✅ All pass** |

---

## Documentation

| Document | Description |
|----------|-------------|
| [BUILD.md](BUILD.md) | Architecture, build instructions, file structure |
| [SECURITY.md](SECURITY.md) | Threat model, data handling, permissions |
| [FEATURES.md](FEATURES.md) | Complete feature inventory |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development guide |
| [RELEASE.md](RELEASE.md) | Release process |
| [PRD.md](PRD.md) | Product requirements document |
| [mcp-server/README.md](mcp-server/README.md) | MCP server setup guide |

---

## Roadmap

### v2 (Planned)
- HTTP server mode for custom integrations
- CLI tool for scripts
- Cursor / IDE-specific support
- Discord/Slack bot integrations
- GitHub Action for secret scanning
- Express.js middleware

### v3 (Future)
- Enterprise policy management
- Fleet management
- SIEM integration
- Compliance reporting

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Maskit Contributors