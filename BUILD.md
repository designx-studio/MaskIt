# Maskit — Build & Product Documentation

**Version:** 2.3.0  
**Platform:** Chrome Extension (Manifest V3) + MCP Server (Claude Desktop)  
**Purpose:** Prevent accidental sharing of sensitive customer data in the browser and desktop apps.

---

## What Maskit Is

Maskit is a client-side Chrome extension that scans text at the moment it enters or leaves a web page — through **paste**, **copy**, or **typing** — and replaces detected sensitive values with safe redacted placeholders before they can be shared in chats, emails, or forms.

All processing happens locally in the browser. No data is sent to an external server.

---

## Core Capabilities

### Scan modes

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Paste** | `paste` event | Blocks default paste, inserts redacted text |
| **Copy** | `copy` event | Replaces clipboard contents with redacted text |
| **Typing** | `beforeinput`, `input`, `keyup`, `compositionend`, `focusout` | Scans as you type; redacts when a pattern completes or you pause between words |

Each mode can be toggled independently in Settings.

### Built-in detection rules

| Rule | What it matches | Example |
|------|-----------------|---------|
| `EMAIL` | Email addresses | `john@example.com` |
| `PHONE` | Kenyan mobile numbers | `+254712345678`, `0712345678` |
| `CARD` | Payment card numbers (13–16 digits) | `4111 1111 1111 1111` |
| `MPESA` | M-Pesa transaction codes | `QKA12X9L4M` |
| `SSN` | US Social Security numbers | `123-45-6789` |
| `API_KEY` | API keys and tokens (see below) | `sk-...`, `ghp_...`, `AKIA...` |
| `IP_ADDRESS` | IPv4 addresses | `192.168.1.1` |
| `PASSPORT` | Passport-style IDs | `AB1234567` |
| `BANK_ACCOUNT` | IBAN bank accounts | `GB82WEST12345698765432` |

Each rule can be enabled or disabled individually.

### API key detection

`API_KEY` uses multiple provider-specific patterns:

- **OpenAI** — `sk-...`, `sk-proj-...`
- **Anthropic** — `sk-ant-api03-...`
- **Stripe** — `sk_live_...`, `pk_test_...`, `rk_live_...`
- **GitHub** — `ghp_...`, `github_pat_...`
- **GitLab** — `glpat-...`
- **Slack** — `xoxb-...`, `xoxp-...`
- **AWS** — `AKIA...`
- **Google** — `AIza...`
- **npm** — `npm_...`
- **Square** — `sq0atp-...`
- **Bearer tokens** — `Bearer eyJhbGci...`
- **Config assignments** — `api_key = "..."`, `secret_key: ...`, `access_token=...`

### Custom rules

Users can define named regex patterns in Settings. Matches are labeled `CUSTOM:<rule name>` and redacted like built-in types.

### Redaction formats

| Format | Output example |
|--------|----------------|
| `tagged` (default) | `[EMAIL_REDACTED]` |
| `stars` | `***` |
| `custom` | User-defined text (e.g. `[REDACTED]`) |

### Control & safety

- **Global on/off** — disable all protection
- **Review before redact** — confirmation dialog with masked preview (`jo***om`) before replacing
- **Site lists** — run on all sites, allowlist only, or blocklist (`*.domain.com` supported)
- **Keyboard shortcut** — `Alt+Shift+M` toggles protection globally

### UI surfaces

| Surface | Purpose |
|---------|---------|
| **Toolbar popup** (`popup.html`) | Quick on/off, live stats, current site status |
| **Settings page** (`options.html`) | Full configuration, custom rules, stats, import/export |
| **Toast notification** | Brief confirmation after a redaction |
| **Review dialog** | Optional pre-redaction confirmation overlay |

### Statistics

Tracked in `chrome.storage.local` under key `stats`:

- Total redactions
- Count by source: `paste`, `copy`, `typing`
- Count by data type
- Resettable from Settings

### Settings backup

- **Export** — download all settings as JSON
- **Import** — restore settings from a JSON file

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Chrome Browser                       │
├─────────────────────────────────────────────────────────┤
│  background.js (service worker)                          │
│    • Keyboard shortcut (Alt+Shift+M)                   │
│    • Stats recording & retrieval                       │
├─────────────────────────────────────────────────────────┤
│  popup.html / options.html                               │
│    • UI for toggles, config, stats                       │
│    • Reads/writes chrome.storage.sync                    │
├─────────────────────────────────────────────────────────┤
│  Content script (injected on http/https pages)           │
│    settings.js → detector.js → sanitizer.js → content.js │
│                                                          │
│    content.js intercepts DOM events and:                 │
│      1. Reads cached settings (sync, in-memory)          │
│      2. Checks site allow/block list                     │
│      3. Runs detectSensitiveData()                       │
│      4. Runs sanitizeText()                              │
│      5. Replaces text in input / contenteditable         │
│      6. Sends stats to background.js                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Desktop                              │
├─────────────────────────────────────────────────────────┤
│  mcp-server/server.js (stdio JSON-RPC)                  │
│    • Registers 6 MCP tools                              │
│    • Reads config from OS-specific location             │
├─────────────────────────────────────────────────────────┤
│  engine/index.js (shared detection core)                │
│    • scanText / redactText / evaluatePolicy             │
│    • getRules / updateRules / getStatus                 │
│    • Risk scoring, severity mapping, false-positive guards│
└─────────────────────────────────────────────────────────┘
```

### Content script load order

```
settings.js  →  detector.js  →  sanitizer.js  →  editors.js  →  content.js
```

`settings.js` is shared across content scripts, popup, options, and the background worker.

### Event handling (content.js)

Paste and copy handlers call `preventDefault()` **synchronously** (no `async/await` before preventDefault — critical for interception to work).

Typing uses a layered approach:

1. **`beforeinput`** — predicts text after insertion; redacts immediately when a full pattern is formed
2. **`keyup`** — immediate scan on Space, Enter, Tab (catches pauses between words)
3. **`input`** + debounce — fallback scan (80ms delay, forced scan every 450ms during continuous typing)
4. **`focusout`** — final scan when leaving a field
5. **`compositionend`** — handles IME input

### Storage

| Key | Storage area | Contents |
|-----|-------------|----------|
| Settings (individual keys) | `chrome.storage.sync` | Toggles, site list, custom rules, format |
| `stats` | `chrome.storage.local` | Redaction counters |

---

## File Structure

```
maskit-extension/
├── manifest.json          # Extension manifest (MV3)
├── settings.js            # Shared defaults, site-list helpers (browser)
├── detector.js            # Regex detection engine (browser)
├── sanitizer.js           # Redaction / replacement logic (browser)
├── editors.js             # ChatGPT/Gmail editor-aware text insertion
├── content.js             # Page-level event handlers
├── background.js          # Service worker (stats, shortcuts, badge)
├── popup.html / .css / .js
├── options.html / .css / .js
├── privacy-policy.html    # Chrome Web Store privacy policy
├── engine/                # Shared detection engine (Node.js)
│   ├── index.js           # Public API entry point
│   ├── detector.js        # Detection patterns & redaction logic
│   ├── settings.js        # Settings, severity, regex safety
│   └── test.js            # Engine test suite (52+ tests)
├── mcp-server/            # MCP server for Claude Desktop
│   ├── server.js          # MCP server (stdio transport)
│   ├── config.js          # OS-specific config management
│   ├── test.js            # MCP server tests (18+ tests)
│   ├── package.json       # MCP server dependencies
│   ├── claude-desktop.json # Example Claude Desktop config
│   └── README.md          # Setup guide
├── scripts/build.js       # Creates dist/maskit-extension.zip
├── website/               # Landing page + HTML demo
│   ├── index.html
│   ├── demo.html
│   └── RECORDING.md
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── test.js                # Browser extension test suite (32+ tests)
├── BUILD.md               # This document
├── SECURITY.md            # Threat model & data handling
└── FEATURES.md            # Feature inventory
```

---

## Settings Schema

Default values are defined in `engine/settings.js` as `MASKIT_DEFAULTS`:

```javascript
{
  enabled: true,
  scanPaste: true,
  scanCopy: true,
  scanTyping: true,
  reviewBeforeRedact: false,
  redactFormat: "tagged",       // "tagged" | "stars" | "custom"
  customRedactText: "[REDACTED]",
  siteListMode: "all",          // "all" | "allowlist" | "blocklist"
  siteList: [],                 // e.g. ["chatgpt.com", "*.google.com"]
  EMAIL: true,
  PHONE: true,
  CARD: true,
  MPESA: true,
  SSN: true,
  API_KEY: true,
  IP_ADDRESS: true,
  PASSPORT: true,
  BANK_ACCOUNT: true,
  customRules: [
    // { id, name, pattern, enabled }
  ]
}
```

---

## Build & Install

Maskit has no compile step. It is loaded as an unpacked extension.

### Prerequisites

- Google Chrome (or Chromium-based browser with MV3 support)
- Node.js 18+ (optional, for running tests)

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `maskit-extension` folder
5. Refresh any open tabs after reloading the extension

### Reload after code changes

1. Go to `chrome://extensions`
2. Click the reload icon on Maskit
3. Refresh pages where Maskit is active

### Run tests

```bash
npm test
```

### Package for Chrome Web Store

```bash
npm run build
```

Creates `dist/maskit-extension.zip` with only the files required for submission (no `node_modules`, tests, or website).

As of v2.3.0, the suite includes **32 browser extension tests**, **52 engine tests**, and **18 MCP server tests** (102 total) covering detection, sanitization, false-positive guards, site rules, API keys, manifest validation, and MCP tool handlers.

---

## Permissions

| Permission | Why |
|------------|-----|
| `storage` | Save settings and stats |
| `host_permissions: https://chatgpt.com/*` | Inject content scripts on ChatGPT |
| `host_permissions: https://chat.openai.com/*` | Inject content scripts on ChatGPT (legacy) |
| `host_permissions: https://mail.google.com/*` | Inject content scripts on Gmail |

No broad `<all_urls>` access. No network, clipboard, or tabs permissions are declared. Clipboard access uses in-event `clipboardData` during paste/copy handlers.

---

## Supported Page Contexts

- Standard `<input>` and `<textarea>` elements
- `contenteditable` fields (e.g. ChatGPT, Gmail compose)
- Shadow DOM (via `composedPath()`)
- iframes (`all_frames: true`)

**Not supported:** `chrome://` pages, Chrome Web Store, or pages where extensions cannot inject scripts.

---

## Toolbar Badge

The extension icon shows a badge on the active tab:

| Badge | Meaning |
|-------|---------|
| **ON** (green) | Protection is enabled on this page |
| **OFF** (grey) | Protection is disabled globally or the site is excluded |

The badge updates when you switch tabs, change settings, or press `Alt+Shift+M`.

---

## Rich Editor Support

`editors.js` detects ChatGPT and Gmail compose fields and:

- Inserts redacted text without wiping the entire editor document
- Replaces only matched sensitive spans during typing scans
- Uses longer debounce intervals to avoid fighting ProseMirror state

---

## False Positive Guards

`detector.js` validates matches before reporting:

- **CARD** — Luhn checksum required
- **M-Pesa** — must mix letters and numbers
- **IP_ADDRESS** — ignores version-like strings (e.g. `1.2.3.4`)
- **PASSPORT** — requires letters and digits, minimum length
- **API_KEY** — minimum length thresholds

---

## Marketing Site

Open `website/index.html` for the landing page.  
Open `website/demo.html` for a self-playing demo suitable for screen recording.  
See `website/RECORDING.md` for video capture instructions.

---

## Known Limitations

- **Regex-based only** — no ML or context-aware detection; false positives/negatives are still possible
- **Rich text editors** outside ChatGPT/Gmail may need additional profiles
- **No file upload scanning**
- **No per-tab toggle** — protection is global (site list provides per-domain control)
- **No undo** after redaction
- **No redaction history log** (only aggregate stats)
- **Review dialog** is optional and blocks only the current redaction action

---

## Manual Test Checklist

1. **Paste** — paste `Contact john@example.com` into a text field → `[EMAIL_REDACTED]`
2. **Copy** — copy text containing an email → clipboard should be redacted
3. **Typing** — type `john@example.com` slowly, then press Space → should redact
4. **API key** — paste `sk-abcdefghijklmnopqrstuvwxyz1234` → `[API_KEY_REDACTED]`
5. **Review mode** — enable in Settings, paste sensitive text → confirm dialog appears
6. **Site blocklist** — add current site, reload → icon greyed / protection off
7. **Shortcut** — press `Alt+Shift+M` → protection toggles
8. **Popup** — click toolbar icon → stats and toggle visible

---

## Version History

| Version | Highlights |
|---------|------------|
| **1.0.0** | Initial release — paste detection for email, phone, card, M-Pesa on select sites |
| **1.0.1** | Fixed async paste bug; broadened site access; improved contenteditable support |
| **2.0.0** | Full feature set — copy/typing scan, 9 data types, custom rules, site lists, review dialog, popup, stats, import/export, keyboard shortcut |
| **2.0.0+** | Expanded API key patterns; improved slow-typing detection (`beforeinput`, word-boundary scans) |
| **2.1.0** | ChatGPT/Gmail editor stabilization, false-positive validators, toolbar badge, CWS build script, landing page + HTML demo |
| **2.2.0** | Security hardening for public release — narrow permissions, trust messaging, regex safety, XSS fixes, stats without raw values |
| **2.3.0** | Shared engine extraction, MCP server for Claude Desktop, 102+ tests, documentation update |

See also [SECURITY.md](SECURITY.md) for the trust model and release checklist.

---

## Shared Engine (`engine/`)

The detection engine is extracted into a standalone Node.js module at `engine/`. It provides:

- `scanText(text, settings)` — full scan with findings, redacted text, risk score, and risk level
- `redactText(text, settings)` — scan and redact only
- `evaluatePolicy(text, settings)` — policy evaluation with allowed/denied result
- `getRules(settings)` / `updateRules(rules, settings)` — rule management
- `getStatus()` — engine version and status

### Risk scoring

Each finding has a severity level (critical / high / medium / low). The risk score is calculated from findings and capped at 100:

| Severity | Weight |
|----------|--------|
| critical | 50 |
| high | 25 |
| medium | 10 |
| low | 5 |

### Expanded cloud key detection

Beyond the original patterns, the engine detects keys for: GCP, Azure, DigitalOcean, Twilio, Datadog, SendGrid, Jira/Atlassian, Terraform, Docker, Kubernetes, Cloudflare, Auth0, Firebase, and Azure DevOps.

### Run engine tests

```bash
node engine/test.js
```

---

## MCP Server (`mcp-server/`)

A local MCP server for Claude Desktop and MCP-capable IDEs. Uses the shared engine.

### Tools

| Tool | Description |
|------|-------------|
| `scan_text` | Scan text for sensitive data |
| `redact_text` | Scan and redact sensitive data |
| `evaluate_policy` | Evaluate text against policy |
| `get_status` | Get engine status |
| `get_rules` | List all active rules |
| `update_rules` | Update custom rules |

### Install

```bash
cd mcp-server && npm install
```

### Run tests

```bash
node mcp-server/test.js
```

### Claude Desktop setup

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "maskit": {
      "command": "node",
      "args": ["C:/path/to/maskit-extension/mcp-server/server.js"]
    }
  }
}
```

See `mcp-server/claude-desktop.json` for the example config.

---

## v2 Roadmap

- HTTP server mode for custom integrations
- CLI tool for scanning text from scripts
- Cursor / IDE-specific support
- Integration scripts (GitHub Action, Express middleware, Discord/Slack bots)
- Per-tab protection toggle
- Redaction undo
- Redaction event history log
- File upload / drag-and-drop scanning
- Additional regional phone number formats
- Shared config import/export between browser and MCP server