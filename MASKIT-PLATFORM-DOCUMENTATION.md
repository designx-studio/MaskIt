# Maskit Platform Documentation

## Overview

Maskit is a **local-first privacy layer that prevents accidental data leaks** in ChatGPT, Gmail, Claude Desktop, and other MCP-capable applications. It detects sensitive content at the moment it enters or leaves a user's device and redacts it before exposure, ensuring no sensitive data is ever transmitted to cloud services.

All processing happens **locally** on the user's machine. No data is sent to external servers. The platform provides client-side protection for text entry into AI tools and email applications through a Chrome browser extension and a desktop MCP server, both powered by a shared detection engine.

---

## Architecture

### Core Components

```
engine/index.js (shared detection core)
       |
   +----+----------------+
   |                     |
browser extension    mcp-server/
(chrome MV3)         (Claude Desktop, MCP-capable apps)
```

### Browser Extension (Chrome)

#### File Structure
```
maskit-extension/
├── manifest.json          # Extension manifest (MV3)
├── background.js          # Service worker
├── content.js             # Page event handlers
├── options.html/.css/.js  # Settings UI
├── popup.html/.css/.js    # Toolbar UI
├── settings.js            # Shared configuration
├── detector.js            # Detection patterns (browser)
├── sanitizer.js           # Redaction logic
├── editors.js             # Rich editor support
├── privacy-policy.html    # CWS privacy policy
└── icons/                # Browser action icons
```

#### Key Responsibilities
- Intercepts paste, copy, and typing events on protected sites (ChatGPT, Gmail)
- Validates site allow/block lists before applying protection
- Runs scans through settings.js → detector.js → sanitizer.js → content.js
- Sends usage statistics without raw content
- Provides review-before-redact confirmation dialogs
- Implements ON/PAUSED/OFF state with traffic light widget

### Desktop MCP Server (Node.js)

#### File Structure
```
mcp-server/
├── server.js              # MCP server implementation (stdio JSON-RPC)
├── config.js              # OS-specific configuration management
├── package.json           # Dependencies
├── README.md              # Setup guide
├── test.js                # MCP server tests (18+)
├── http-server.js         # v2 HTTP mode adapter
├── cli.js                 # v2 CLI tool
└── integrations/          # v2 integration examples
```

#### Key Responsibilities
- Provides 6 MCP tools for Claude Desktop:
  - `scan_text`: Scan text for sensitive data
  - `redact_text`: Scan and redact sensitive data  
  - `evaluate_policy`: Evaluate text against policy
  - `get_status`: Get engine status
  - `get_rules`: List active rules
  - `update_rules`: Update custom rules
- Maintains OS-specific configuration files
- Uses shared detection engine for consistent protection

### Shared Detection Engine (Node.js)

#### File Structure
```
engine/
├── index.js               # Public API entry point
├── detector.js            # Detection patterns & logic
├── settings.js            # Severity configuration & regex safety
└── test.js                # Test suite (52+)
```

#### Key Responsibilities
- Provides unified detection API across all platforms
- Implements risk scoring (0-100) with severity mapping
- Maintains built-in patterns (9 data types + 30+ cloud keys)
- Validates custom regex for safety and performance
- Applies false-positive guards for each detection type

---

## Detection Capabilities

### Built-in Data Types

| Type | Severity | Pattern | Examples |
|------|----------|---------|----------|
| **API_KEY** | critical | 30+ provider patterns | `sk-...`, `AKIA...`, `ghp_...` |
| **CARD** | critical | 13-16 digits + Luhn validation | `4111 1111 1111 1111` |
| **SSN** | critical | `XXX-XX-XXXX` | `123-45-6789` |
| **BANK_ACCOUNT** | critical | IBAN format | `GB82WEST12345698765432` |
| **PASSPORT** | high | Letters + digits, min length | `AB1234567` |
| **IP_ADDRESS** | high | IPv4, version-less validation | `192.168.1.1` |
| **EMAIL** | medium | Email format with filters | `john@example.com` |
| **PHONE** | medium | Kenyan +254, 07xx formats | `+254712345678`, `0712345678` |
| **MPESA** | low | Mixed alphanumeric, validation | `QKA12X9L4M` |

### Risk Scoring

- **Severity weights:** critical=50, high=25, medium=10, low=5
- **Risk Score:** Sum of finding weights, capped at 100
- **Risk Level:** 0-9 (low), 10-24 (medium), 25-49 (high), 50+ (critical)

---

## Protection Mechanisms

### Scan Modes

| Mode | Trigger | Description |
|------|---------|-------------|
| **Paste** | `paste` event | Blocks default paste, inserts redacted content |
| **Copy** | `copy` event | Replaces clipboard with redacted content |
| **Typing** | `beforeinput`, `input`, `keyup`, `focusout`, `compositionend` | Real-time scanning during typing |

### Control & Safety

- **Global on/off toggle** disables all protection
- **Review before redact** shows masked preview before replacement
- **Site lists** (allow/block) provide per-domain control
- **Auto-resume pause** temporarily suspends with configurable timeouts
- **Keyboard shortcuts:** `Alt+Shift+M` (toggle), `Alt+Shift+P` (pause)
- **Traffic light widget** shows protection status in top-right
- **Per-site toggle** excludes specific pages from protection

---

## Data Handling & Privacy

### Security Model

#### Threat Model
- All processing stays local
- Minimal host permissions only for ChatGPT, Gmail
- No raw page content or clipboard history stored
- UI never renders untrusted strings as HTML
- Custom regex validated for catastrophic backtracking protection

#### Data Storage

| Data | Stored? | Location |
|------|---------|----------|
| Settings / toggles | Yes | `chrome.storage.sync` |
| Aggregate counters | Yes | `chrome.storage.local` |
| Matched sensitive text | **No** | Never |
| Clipboard logs | **No** | Never |
| Page URLs beyond hostname | **No** | Not stored |

#### Permissions (v2.4.0)

```json
{
  "host_permissions": [
    "https://chatgpt.com/*",
    "https://chat.openai.com/*",
    "https://mail.google.com/*"
  ],
  "storage": true
}
```

---

## Integration Surfaces

### Browser Extension

#### Rich Editor Support
- Detects ChatGPT ProseMirror and Gmail compose fields
- Uses Selection API for precise text replacement
- Falls back to execCommand for other editors
- Long debounce intervals avoid ProseMirror state conflicts

#### Event Handling
```
Paste/Copy: preventDefault() synchronously (critical for interception)

Typing scan layers:
1. beforeinput - immediate redact when pattern completes
2. keyup - scan on Space/Enter/Tab between words
3. input + debounce - 80ms delay, forced every 450ms
4. focusout - final scan when leaving field
5. compositionend - handles IME input
```

### Desktop Integration

#### Claude Desktop Setup
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

#### IDE Support
- Cursor IDE
- Any MCP-capable IDE
- Graphical progress widgets show protection status

---

## Testing & Quality

### Test Coverage

| Suite | Tests | Status |
|-------|-------|--------|
| Engine (engine/test.js) | 85 | ✅ All pass |
| Browser Extension (test.js) | 38 | ✅ All pass |
| MCP Server (mcp-server/test.js) | 18 | ✅ All pass |
| **Total** | **141** | **✅ All pass** |

### Test Categories

- **Engine tests:** Detection patterns, false-positive guards, edge cases
- **Extension tests:** Paste/copy interception, site rules, UI behavior
- **MCP tests:** Tool communication, error handling, configuration management

---

## Verification Evidence

The following implementation details have been verified directly from the codebase.

### Test Coverage

Current automated test coverage consists of:

| Location | Test Cases |
|---|---:|
| `test.js` (root level) | 38 |
| `engine/test.js` | 85 |
| `mcp-server/test.js` | 18 |
| Total verified test cases | 141 |

### CI/CD Security Validation

The CI pipeline includes automated regular expression safety validation to detect Regular Expression Denial of Service (ReDoS) risks.

Verified workflow step in `.github/workflows/ci.yml`:

```yaml
- name: Validate regex safety (ReDoS)
  run: npm run test:regex
```

This confirms regex safety testing is part of the continuous integration process.

### MCP Server Tools

The MCP server currently exposes the following registered tools:

1. `scan_text`
2. `redact_text`
3. `evaluate_policy`
4. `scan_response`
5. `get_status`
6. `get_rules`
7. `get_audit_log`

These tools represent the currently implemented MCP interface capabilities.

### Audit Log Integrity Mechanism

The browser extension implements an audit log integrity mechanism using chained SHA-256 hashes.

Verified implementation in `background.js`:

```javascript
async function computeChainHash(previousHash, eventId, timestamp) {
  const input = (previousHash || "0") + eventId + timestamp;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

The chain hash links audit events using:

```
previous hash + event ID + timestamp → SHA-256 hash
```

This provides tamper evidence for stored audit events. The implementation currently stores the audit log using:

```javascript
chrome.storage.local.set({ auditLog });
```

**Note:** This mechanism provides hash chaining for tamper detection, not full immutability. The code confirms hash chaining for tamper evidence, not external storage, append-only enforcement, or independent verification.

---

## Build & Distribution

### Production Workflow

1. **Prerequisites:** Google Chrome, Node.js 18+
2. **Load Extension:** `chrome://extensions` → Load unpacked
3. **Run Tests:** `npm test` (full suite)
4. **Package:** `npm run build` creates `dist/maskit-extension.zip`
5. **Deploy:** Manual upload to Chrome Web Store

### Build Process

```
Production files only:
- manifest.json
- background.js, content.js, settings.js, detector.js, sanitizer.js, editors.js
- popup.html/.css/.js, options.html/.css/.js
- privacy-policy.html
- icons/icon16.png, icon48.png, icon128.png

Excludes: node_modules/, test files, website/, dev artifacts
```

---

## API Reference

### Shared Engine Public API

```javascript
// scanText(text, settings) → { findings, redactedText, riskScore, riskLevel, matchedRules }
// redactText(text, settings) → { redactedText, findings }
// evaluatePolicy(text, settings) → { allowed, findings, riskScore, riskLevel, reason }
// getRules(settings) → { rules, customRules }
// updateRules(customRules, settings) → updated settings
// getStatus() → { version, engineReady, rulesEnabled }
```

### MCP Server Tools

| Tool | Input | Output |
|------|-------|--------|
| `scan_text` | `{ text, app? }` | Findings, risk score, risk level, redacted text |
| `redact_text` | `{ text, format?, app? }` | Redacted text with findings |
| `evaluate_policy` | `{ text, app? }` | Allowed/denied with risk score |
| `get_status` | `{}` | Engine version, config path, rules count |
| `get_rules` | `{}` | Built-in and custom rules |
| `update_rules` | `{ customRules }` | Updated custom rules |

---

## Development & Migration

### From v1 to v2.4.0

#### Key Changes
1. **Shared Engine Extraction:** Detection core now standalone module
2. **MCP Server Added:** Claude Desktop integration with 6 tools
3. **Risk Scoring:** 0-100 scale with severity mapping
4. **Expanded API Keys:** 30+ cloud provider patterns
5. **Enhanced Testing:** 102 tests vs 93+ minimum requirement

#### Migration Path
1. Load unpacked extension for development
2. Update MCP config in Claude Desktop (`claude_desktop_config.json`)
3. Import settings from browser storage if available
4. Verify all tools appear in Claude Desktop

---

## Future Roadmap (v2/v3)

### Deferred to v2

- HTTP server for custom integrations
- CLI tool for script scanning
- Cursor / IDE-specific support
- Discord/Slack bot integrations
- GitHub Action integration
- Express.js middleware

### Deferred to v3

- Per-tab protection toggle
- Redaction undo functionality
- Redaction event history logging
- File upload / drag-and-drop scanning
- Additional regional phone formats
- Shared config sync between browser and MCP

---

## Success Metrics

### v1 Release Criteria

✅ **Functionality**
- Protects data in ChatGPT, Gmail, and Claude Desktop
- Redaction happens locally and reliably
- Product understandable in one sentence: "Maskit is a local-first privacy layer that stops sensitive text from leaving your device"

✅ **Trust & Privacy**
- Users trust the privacy model (no raw data uploads)
- Chrome permissions stay minimal and privacy-friendly
- No telemetry that includes content or matched values

✅ **Quality**
- 102 tests pass (exceeds 93+ requirement)
- ESLint configuration enforced
- Full CI/CD pipeline

---

## Related Documents

- [SECURITY.md](SECURITY.md) - Threat model and data handling
- [mcp-server/README.md](mcp-server/README.md) - MCP server setup guide
- [FEATURES.md](FEATURES.md) - Feature inventory
- [BUILD.md](BUILD.md) - Build and installation guide
- [PRD.md](PRD.md) - Product requirements document
- [PLAN.md](PLAN.md) - Implementation plan status
- [BUILD-ROADMAP.md](BUILD-ROADMAP.md) - Production readiness roadmap

---

*Last updated: July 25, 2026 (v2.4.0) *

This comprehensive documentation covers the complete Maskit platform architecture, from browser extension to desktop MCP server, with emphasis on local-first privacy and robust protection against accidental data leaks.